import type { AeroFieldProvider, AeroFieldSample } from '../core/aeroTypes'
import { assertValidPrecomputedCfdDataset, type PrecomputedCfdDataset } from '../core/cfdDataset'

type DatasetPair = [PrecomputedCfdDataset, PrecomputedCfdDataset]

const AIR_DENSITY_KG_M3 = 1.225

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function sameTuple(a: readonly number[], b: readonly number[], epsilon = 1e-6) {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) <= epsilon)
}

function assertInterpolationCompatible(lower: PrecomputedCfdDataset, upper: PrecomputedCfdDataset) {
  const problems: string[] = []
  if (lower.metadata.geometryRevision !== upper.metadata.geometryRevision) problems.push('geometry revision')
  if (lower.metadata.coordinateSystem !== upper.metadata.coordinateSystem) problems.push('coordinate system')
  if (lower.metadata.aeroMode !== upper.metadata.aeroMode) problems.push('aero mode')
  if (Math.abs(lower.metadata.yawDeg - upper.metadata.yawDeg) > 0.01) problems.push('yaw')
  if (!sameTuple(lower.grid.origin, upper.grid.origin)) problems.push('grid origin')
  if (!sameTuple(lower.grid.spacing, upper.grid.spacing)) problems.push('grid spacing')
  if (!sameTuple(lower.grid.dimensions, upper.grid.dimensions, 0)) problems.push('grid dimensions')
  if (lower.metadata.units.velocity !== upper.metadata.units.velocity) problems.push('velocity units')
  if (lower.metadata.units.pressure !== upper.metadata.units.pressure) problems.push('pressure units')
  if (lower.metadata.units.vorticity !== upper.metadata.units.vorticity) problems.push('vorticity units')
  if (problems.length) throw new Error(`CFD datasets cannot be interpolated because ${problems.join(', ')} differ.`)
}

function cellIndex(dataset: PrecomputedCfdDataset, x: number, y: number, z: number) {
  const [nx, ny] = dataset.grid.dimensions
  return x + nx * (y + ny * z)
}

type GridCoordinates = {
  x0: number
  x1: number
  y0: number
  y1: number
  z0: number
  z1: number
  tx: number
  ty: number
  tz: number
}

function gridCoordinates(dataset: PrecomputedCfdDataset, x: number, y: number, z: number): GridCoordinates {
  const [ox, oy, oz] = dataset.grid.origin
  const [sx, sy, sz] = dataset.grid.spacing
  const [nx, ny, nz] = dataset.grid.dimensions
  const gx = clamp((x - ox) / sx, 0, nx - 1)
  const gy = clamp((y - oy) / sy, 0, ny - 1)
  const gz = clamp((z - oz) / sz, 0, nz - 1)
  const x0 = Math.min(Math.floor(gx), nx - 2)
  const y0 = Math.min(Math.floor(gy), ny - 2)
  const z0 = Math.min(Math.floor(gz), nz - 2)
  return {
    x0,
    x1: x0 + 1,
    y0,
    y1: y0 + 1,
    z0,
    z1: z0 + 1,
    tx: gx - x0,
    ty: gy - y0,
    tz: gz - z0,
  }
}

function trilinearScalar(dataset: PrecomputedCfdDataset, values: ArrayLike<number>, x: number, y: number, z: number) {
  const c = gridCoordinates(dataset, x, y, z)
  const value = (ix: number, iy: number, iz: number) => values[cellIndex(dataset, ix, iy, iz)]
  const c00 = lerp(value(c.x0, c.y0, c.z0), value(c.x1, c.y0, c.z0), c.tx)
  const c10 = lerp(value(c.x0, c.y1, c.z0), value(c.x1, c.y1, c.z0), c.tx)
  const c01 = lerp(value(c.x0, c.y0, c.z1), value(c.x1, c.y0, c.z1), c.tx)
  const c11 = lerp(value(c.x0, c.y1, c.z1), value(c.x1, c.y1, c.z1), c.tx)
  return lerp(lerp(c00, c10, c.ty), lerp(c01, c11, c.ty), c.tz)
}

function trilinearVelocity(dataset: PrecomputedCfdDataset, x: number, y: number, z: number): [number, number, number] {
  const sampleComponent = (component: 0 | 1 | 2) => {
    const c = gridCoordinates(dataset, x, y, z)
    const value = (ix: number, iy: number, iz: number) =>
      dataset.grid.velocity[cellIndex(dataset, ix, iy, iz) * 3 + component]
    const c00 = lerp(value(c.x0, c.y0, c.z0), value(c.x1, c.y0, c.z0), c.tx)
    const c10 = lerp(value(c.x0, c.y1, c.z0), value(c.x1, c.y1, c.z0), c.tx)
    const c01 = lerp(value(c.x0, c.y0, c.z1), value(c.x1, c.y0, c.z1), c.tx)
    const c11 = lerp(value(c.x0, c.y1, c.z1), value(c.x1, c.y1, c.z1), c.tx)
    return lerp(lerp(c00, c10, c.ty), lerp(c01, c11, c.ty), c.tz)
  }
  return [sampleComponent(0), sampleComponent(1), sampleComponent(2)]
}

function nearestCell(dataset: PrecomputedCfdDataset, x: number, y: number, z: number): [number, number, number] {
  const [ox, oy, oz] = dataset.grid.origin
  const [sx, sy, sz] = dataset.grid.spacing
  const [nx, ny, nz] = dataset.grid.dimensions
  return [
    clamp(Math.round((x - ox) / sx), 0, nx - 1),
    clamp(Math.round((y - oy) / sy), 0, ny - 1),
    clamp(Math.round((z - oz) / sz), 0, nz - 1),
  ]
}

function isSolidIn(dataset: PrecomputedCfdDataset, x: number, y: number, z: number) {
  if (!dataset.grid.solidMask) return false
  const [ix, iy, iz] = nearestCell(dataset, x, y, z)
  return dataset.grid.solidMask[cellIndex(dataset, ix, iy, iz)] >= 0.5
}

function pressureCoefficient(dataset: PrecomputedCfdDataset, pressure: number | undefined) {
  if (pressure === undefined || dataset.metadata.units.pressure === undefined) return null
  if (dataset.metadata.units.pressure === 'Cp') return pressure
  const speedMs = dataset.metadata.speedKmh / 3.6
  const dynamicPressurePa = 0.5 * AIR_DENSITY_KG_M3 * speedMs * speedMs
  return dynamicPressurePa > 0 ? pressure / dynamicPressurePa : 0
}

function dimensionlessVorticity(dataset: PrecomputedCfdDataset, vorticity: number | undefined) {
  if (vorticity === undefined || dataset.metadata.units.vorticity === undefined) return 0
  if (dataset.metadata.units.vorticity === 'dimensionless') return Math.abs(vorticity)
  const speedMs = dataset.metadata.speedKmh / 3.6
  return speedMs > 0 ? (Math.abs(vorticity) * dataset.metadata.characteristicLengthM) / speedMs : 0
}

function sampleDataset(dataset: PrecomputedCfdDataset, x: number, y: number, z: number): AeroFieldSample {
  const solid = isSolidIn(dataset, x, y, z)
  if (dataset.metadata.speedKmh <= 0) {
    return { velocity: [0, 0, 0], speedRatio: 0, pressureEstimate: 0, vorticity: 0, solid }
  }
  const velocityMs = trilinearVelocity(dataset, x, y, z)
  const freeStreamMs = dataset.metadata.speedKmh / 3.6
  const velocity: [number, number, number] = [
    velocityMs[0] / freeStreamMs,
    velocityMs[1] / freeStreamMs,
    velocityMs[2] / freeStreamMs,
  ]
  const speedRatio = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2)
  const pressure = dataset.grid.pressure ? trilinearScalar(dataset, dataset.grid.pressure, x, y, z) : undefined
  const vorticity = dataset.grid.vorticity ? trilinearScalar(dataset, dataset.grid.vorticity, x, y, z) : undefined
  return {
    velocity,
    speedRatio,
    pressureEstimate: pressureCoefficient(dataset, pressure),
    vorticity: dimensionlessVorticity(dataset, vorticity),
    solid,
  }
}

export class PrecomputedCfdFieldProvider implements AeroFieldProvider {
  readonly kind = 'precomputed-cfd' as const
  readonly metadata
  private readonly lower: PrecomputedCfdDataset
  private readonly upper: PrecomputedCfdDataset | null
  private readonly blend: number

  constructor(datasetOrPair: PrecomputedCfdDataset | DatasetPair, targetSpeedKmh?: number) {
    if (Array.isArray(datasetOrPair)) {
      this.lower = datasetOrPair[0]
      this.upper = datasetOrPair[1]
    } else {
      this.lower = datasetOrPair as PrecomputedCfdDataset
      this.upper = null
    }
    assertValidPrecomputedCfdDataset(this.lower)
    if (this.upper) {
      assertValidPrecomputedCfdDataset(this.upper)
      assertInterpolationCompatible(this.lower, this.upper)
      const requestedSpeed = targetSpeedKmh ?? this.lower.metadata.speedKmh
      const span = this.upper.metadata.speedKmh - this.lower.metadata.speedKmh
      if (span <= 0) throw new Error('Interpolated CFD datasets must be ordered by increasing speed.')
      if (requestedSpeed < this.lower.metadata.speedKmh || requestedSpeed > this.upper.metadata.speedKmh) {
        throw new Error('Requested CFD interpolation speed is outside the dataset bracket.')
      }
      this.blend = (requestedSpeed - this.lower.metadata.speedKmh) / span
    } else {
      this.blend = 0
    }

    const speedKmh = this.upper
      ? lerp(this.lower.metadata.speedKmh, this.upper.metadata.speedKmh, this.blend)
      : this.lower.metadata.speedKmh
    this.metadata = {
      source: this.upper ? `${this.lower.metadata.source} + ${this.upper.metadata.source}` : this.lower.metadata.source,
      solver: this.lower.metadata.solver,
      speedKmh,
      yawDeg: this.lower.metadata.yawDeg,
      aeroMode: this.lower.metadata.aeroMode,
      rideHeightMm: this.lower.metadata.rideHeightMm,
      reynoldsNumber: this.lower.metadata.reynoldsNumber,
      geometryRevision: this.lower.metadata.geometryRevision,
      coordinateSystem: this.lower.metadata.coordinateSystem,
      datasetIds: this.upper ? [this.lower.id, this.upper.id] : [this.lower.id],
      units: {
        velocity: 'V/V∞ (derived from dataset m/s)',
        pressure: this.lower.metadata.units.pressure ? 'pressure coefficient' : undefined,
        vorticity: this.lower.metadata.units.vorticity ? 'dimensionless relative vorticity' : undefined,
      },
      description: this.upper
        ? 'Precomputed CFD datasets — realtime visualization with speed interpolation between compatible solved conditions.'
        : 'Precomputed CFD dataset — realtime visualization of a solved condition.',
    }
  }

  isSolid(x: number, y: number, z: number) {
    return isSolidIn(this.lower, x, y, z) || (this.upper ? isSolidIn(this.upper, x, y, z) : false)
  }

  projectOutside(x: number, y: number, z: number): [number, number, number] {
    if (!this.isSolid(x, y, z)) return [x, y, z]
    const dataset = this.lower
    const [cx, cy, cz] = nearestCell(dataset, x, y, z)
    const [nx, ny, nz] = dataset.grid.dimensions
    const [ox, oy, oz] = dataset.grid.origin
    const [sx, sy, sz] = dataset.grid.spacing
    for (let radius = 1; radius <= 5; radius += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== radius) continue
            const ix = cx + dx
            const iy = cy + dy
            const iz = cz + dz
            if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) continue
            const px = ox + ix * sx
            const py = oy + iy * sy
            const pz = oz + iz * sz
            if (!this.isSolid(px, py, pz)) return [px, py, pz]
          }
        }
      }
    }
    return [x, y, z]
  }

  sample(x: number, y: number, z: number): AeroFieldSample {
    const lower = sampleDataset(this.lower, x, y, z)
    if (!this.upper) return lower
    const upper = sampleDataset(this.upper, x, y, z)
    const pressureEstimate =
      lower.pressureEstimate === null || upper.pressureEstimate === null
        ? null
        : lerp(lower.pressureEstimate, upper.pressureEstimate, this.blend)
    const velocity: [number, number, number] = [
      lerp(lower.velocity[0], upper.velocity[0], this.blend),
      lerp(lower.velocity[1], upper.velocity[1], this.blend),
      lerp(lower.velocity[2], upper.velocity[2], this.blend),
    ]
    return {
      velocity,
      speedRatio: Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2),
      pressureEstimate,
      vorticity: lerp(lower.vorticity, upper.vorticity, this.blend),
      solid: lower.solid || upper.solid,
    }
  }
}
