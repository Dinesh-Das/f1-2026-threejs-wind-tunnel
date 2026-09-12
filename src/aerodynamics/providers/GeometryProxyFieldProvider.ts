import type { AeroFieldProvider, AeroFieldSample, AeroMode, StreamlinePoint } from '../core/aeroTypes'
import type { FlowScenario } from '../core/flowScenarios'
import type { GeometryFieldSnapshot, GeometryObstacle } from '../core/geometryFieldRegistry'

type Conditions = {
  speedKmh: number
  yawDeg: number
  aeroMode: AeroMode
  scenario: FlowScenario
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const gaussian = (value: number, centre: number, spread: number) =>
  Math.exp(-Math.pow(value - centre, 2) / (2 * spread * spread))

function inBox(x: number, y: number, z: number, box: GeometryObstacle, margin = 0) {
  return (
    x >= box.min[0] - margin &&
    x <= box.max[0] + margin &&
    y >= box.min[1] - margin &&
    y <= box.max[1] + margin &&
    z >= box.min[2] - margin &&
    z <= box.max[2] + margin
  )
}

function boxDistance(x: number, y: number, z: number, box: GeometryObstacle) {
  const dx = Math.max(box.min[0] - x, 0, x - box.max[0])
  const dy = Math.max(box.min[1] - y, 0, y - box.max[1])
  const dz = Math.max(box.min[2] - z, 0, z - box.max[2])
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function fallbackBounds(): GeometryFieldSnapshot['bounds'] {
  return { min: [-1.8, -0.55, -4.4], max: [1.8, 1.65, 4.4] }
}

export class GeometryProxyFieldProvider implements AeroFieldProvider {
  readonly kind = 'geometry-aware-proxy' as const
  readonly metadata
  private readonly bounds
  private readonly obstacles
  private readonly yawRad

  constructor(
    snapshot: GeometryFieldSnapshot | null,
    private readonly conditions: Conditions,
  ) {
    this.bounds = snapshot?.bounds ?? fallbackBounds()
    this.obstacles = snapshot?.obstacles ?? []
    const yawDeg = conditions.yawDeg
    this.yawRad = (yawDeg * Math.PI) / 180
    this.metadata = {
      source: snapshot?.sourceModel ?? '2026 regulation reference envelope',
      speedKmh: conditions.speedKmh,
      yawDeg,
      aeroMode: conditions.aeroMode,
      description: snapshot
        ? 'Geometry-aware realtime approximation derived from loaded-mesh semantic bounds.'
        : 'Geometry-aware realtime approximation using a regulation-scale envelope while the model field is unavailable.',
    }
  }

  isSolid(x: number, y: number, z: number) {
    return this.obstacles.some((box) => inBox(x, y, z, box, 0.015))
  }

  projectOutside(x: number, y: number, z: number): [number, number, number] {
    const containing = this.obstacles.find((box) => inBox(x, y, z, box, 0.02))
    if (!containing) return [x, y, z]
    const padding = 0.055
    const candidates: Array<[number, number, number, number]> = [
      [containing.min[0] - padding, y, z, Math.abs(x - containing.min[0])],
      [containing.max[0] + padding, y, z, Math.abs(containing.max[0] - x)],
      [x, containing.max[1] + padding, z, Math.abs(containing.max[1] - y)],
    ]
    candidates.sort((a, b) => a[3] - b[3])
    return [candidates[0][0], candidates[0][1], candidates[0][2]]
  }

  sample(x: number, y: number, z: number, seed = 0): AeroFieldSample {
    if (this.conditions.speedKmh <= 0) {
      return { velocity: [0, 0, 0], speedRatio: 0, pressureEstimate: 0, vorticity: 0, solid: this.isSolid(x, y, z) }
    }

    const solid = this.isSolid(x, y, z)
    const { scenario, aeroMode } = this.conditions
    const bounds = this.bounds
    const centerX = (bounds.min[0] + bounds.max[0]) * 0.5
    const bodyWidth = Math.max(0.8, bounds.max[0] - bounds.min[0])
    const bodyHeight = Math.max(0.7, bounds.max[1] - bounds.min[1])
    const carLength = Math.max(5, bounds.max[2] - bounds.min[2])
    const speedRatioInput = clamp(this.conditions.speedKmh / 350, 0, 1)
    const modeWakeScale = aeroMode === 'straight' ? 0.74 : 1

    let vx = Math.sin(this.yawRad)
    let vy = 0
    const vz = -Math.cos(this.yawRad)
    let speedRatio = 1
    let pressureEstimate = 0
    let vorticity = 0

    for (const obstacle of this.obstacles) {
      const distance = boxDistance(x, y, z, obstacle)
      const influence = clamp(1 - distance / 0.72, 0, 1)
      if (influence <= 0) continue
      const cx = (obstacle.min[0] + obstacle.max[0]) * 0.5
      const cy = (obstacle.min[1] + obstacle.max[1]) * 0.5
      const halfX = Math.max(0.08, (obstacle.max[0] - obstacle.min[0]) * 0.5)
      const halfY = Math.max(0.08, (obstacle.max[1] - obstacle.min[1]) * 0.5)
      const lateral = clamp((x - cx) / halfX, -1.5, 1.5)
      const vertical = clamp((y - cy) / halfY, -1.2, 1.2)

      // AABB proximity is a cheap runtime representation derived from the real
      // loaded mesh. It is intentionally conservative to stop paths entering
      // bodywork without doing per-particle triangle closest-point queries.
      vx += (Math.abs(lateral) < 0.12 ? (x >= centerX ? 1 : -1) : lateral) * influence * 0.33
      vy += Math.max(-0.2, vertical) * influence * 0.12

      const upstreamDistance = z - obstacle.max[2]
      if (
        upstreamDistance >= 0 &&
        upstreamDistance < 0.9 &&
        x >= obstacle.min[0] - 0.25 &&
        x <= obstacle.max[0] + 0.25 &&
        y >= obstacle.min[1] - 0.2 &&
        y <= obstacle.max[1] + 0.2
      ) {
        const stagnation = 1 - upstreamDistance / 0.9
        speedRatio -= stagnation * 0.38
        pressureEstimate += stagnation * 0.7
      }

      if (/wheel/i.test(obstacle.semantic) && z < obstacle.max[2]) {
        const wake = gaussian(x, cx, halfX + 0.28) * Math.exp(-Math.max(0, obstacle.min[2] - z) / 3.2)
        vorticity += wake * 0.55 * scenario.vorticityStrength
        speedRatio -= wake * 0.08
      }
    }

    const underfloor =
      x > bounds.min[0] + bodyWidth * 0.12 &&
      x < bounds.max[0] - bodyWidth * 0.12 &&
      y > bounds.min[1] - 0.22 &&
      y < bounds.min[1] + bodyHeight * 0.23 &&
      z < bounds.max[2] - carLength * 0.12 &&
      z > bounds.min[2] + carLength * 0.06
    if (underfloor) {
      const floorGain = scenario.floorStrength * (0.08 + 0.15 * speedRatioInput)
      speedRatio += floorGain
      vy -= 0.055 * scenario.floorStrength
      pressureEstimate -= 0.55 * scenario.floorStrength
    }

    const wakeProgress = z < bounds.min[2] ? clamp((bounds.min[2] - z) / Math.max(3.8, carLength * 0.8), 0, 1) : 0
    if (wakeProgress > 0) {
      const wakeWidth = bodyWidth * (0.36 + wakeProgress * 0.23)
      const wakeCore =
        gaussian(x, centerX + Math.tan(this.yawRad) * wakeProgress * 1.2, wakeWidth) *
        gaussian(y, bounds.min[1] + bodyHeight * 0.42, bodyHeight * 0.52)
      const deficit = wakeCore * scenario.wakeStrength * scenario.wakeDeficit * modeWakeScale
      speedRatio -= deficit
      vorticity += wakeCore * scenario.vorticityStrength * modeWakeScale * 0.72
      const phase = seed * 1.7 + z * 2.6 + x * 2.1
      vx += Math.sin(phase) * scenario.turbulence * wakeCore * 0.13
      vy += Math.cos(phase * 1.13) * scenario.turbulence * wakeCore * 0.065
      pressureEstimate += deficit * 0.16
    }

    if (solid) {
      const projected = this.projectOutside(x, y, z)
      vx += (projected[0] - x) * 5
      vy += (projected[1] - y) * 5
      speedRatio = 0.05
    }

    const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1
    const clampedSpeed = clamp(speedRatio, 0.05, 1.38)
    return {
      velocity: [(vx / magnitude) * clampedSpeed, (vy / magnitude) * clampedSpeed, (vz / magnitude) * clampedSpeed],
      speedRatio: clampedSpeed,
      pressureEstimate: clamp(pressureEstimate, -1, 1),
      vorticity: clamp(vorticity, 0, 1.5),
      solid,
    }
  }
}

export function integrateGeometryStreamline(
  provider: AeroFieldProvider,
  startX: number,
  startY: number,
  seed = 0,
  steps = 58,
  stepSceneUnits = 0.3,
): StreamlinePoint[] {
  let x = startX
  let y = startY
  let z = 8
  const points: StreamlinePoint[] = [{ x, y, z }]

  for (let index = 1; index < steps; index += 1) {
    const first = provider.sample(x, y, z, seed + index * 0.17)
    const midX = x + first.velocity[0] * stepSceneUnits * 0.5
    const midY = y + first.velocity[1] * stepSceneUnits * 0.5
    const midZ = z + first.velocity[2] * stepSceneUnits * 0.5
    const mid = provider.sample(midX, midY, midZ, seed + index * 0.17)

    let nextX = x + mid.velocity[0] * stepSceneUnits
    let nextY = y + mid.velocity[1] * stepSceneUnits
    let nextZ = z + mid.velocity[2] * stepSceneUnits
    if (provider.isSolid(nextX, nextY, nextZ)) {
      ;[nextX, nextY, nextZ] = provider.projectOutside(nextX, nextY, nextZ)
    }

    x = clamp(nextX, -4.25, 4.25)
    y = clamp(nextY, -0.54, 3.35)
    z = nextZ
    points.push({ x, y, z })
  }
  return points
}
