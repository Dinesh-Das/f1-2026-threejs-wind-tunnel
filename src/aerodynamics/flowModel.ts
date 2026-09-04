import type { FlowPreset } from '../store/useF1Store'
import type { TeamGeometryProfile } from '../data/teams'

export type FlowScenario = {
  yaw: number
  turbulence: number
  wake: number
  floor: number
  vortex: number
  lateralDeflection: number
  wakeDeficit: number
}

export const FLOW_SCENARIOS: Record<FlowPreset, FlowScenario> = {
  'Clean Air': { yaw: 0, turbulence: .05, wake: .28, floor: .72, vortex: .48, lateralDeflection: .72, wakeDeficit: .10 },
  Cornering: { yaw: .16, turbulence: .24, wake: .66, floor: .62, vortex: .82, lateralDeflection: .9, wakeDeficit: .22 },
  'High Speed': { yaw: 0, turbulence: .08, wake: .48, floor: 1, vortex: .68, lateralDeflection: .82, wakeDeficit: .15 },
  'Low Speed': { yaw: 0, turbulence: .12, wake: .34, floor: .45, vortex: .42, lateralDeflection: .62, wakeDeficit: .08 },
  'Slipstream Demonstration': { yaw: 0, turbulence: .3, wake: 1, floor: .78, vortex: .9, lateralDeflection: .56, wakeDeficit: .42 },
  'Dirty Air': { yaw: .05, turbulence: .72, wake: 1, floor: .65, vortex: 1, lateralDeflection: 1, wakeDeficit: .34 },
}

export const FLOW_PRESET_SPEED_KMH: Record<FlowPreset, number> = {
  'Clean Air': 200,
  Cornering: 150,
  'High Speed': 300,
  'Low Speed': 100,
  'Slipstream Demonstration': 280,
  'Dirty Air': 220,
}

export type ProxyFlowSample = {
  dx: number
  dy: number
  dz: number
  speedRatio: number
  vorticity: number
}

export type ProxyStreamlinePoint = {
  x: number
  y: number
  z: number
}

const gaussian = (value: number, centre: number, spread: number) =>
  Math.exp(-Math.pow(value - centre, 2) / (2 * spread * spread))

/**
 * Lightweight geometry-reactive velocity-field proxy for visualization.
 * It intentionally preserves physically meaningful trends (stagnation,
 * wheel wake, floor acceleration, diffuser recovery and rear wake deficit)
 * without claiming to solve Navier-Stokes or reproduce constructor CFD.
 */
export function sampleProxyFlow(
  x: number,
  y: number,
  z: number,
  geometry: TeamGeometryProfile,
  scenario: FlowScenario,
  windRatio: number,
  seed = 0,
): ProxyFlowSample {
  const side = Math.sign(x || 1)
  const absX = Math.abs(x)
  const speedScale = .35 + .65 * Math.max(0, Math.min(1, windRatio))

  const nose = gaussian(z, 3.25, .92) * gaussian(absX, .32, .72)
  const noseDisplacement = side * nose * .24 * geometry.noseTipWidth * scenario.lateralDeflection

  const sidepod = gaussian(z, -.05, 1.25) * gaussian(absX, 1.0, .58)
  const sidepodWash = side * sidepod * .2 * geometry.sidepodWidth * scenario.lateralDeflection

  const floorWidth = 1.3 * geometry.floorEdgeWidth
  const underfloor = absX < floorWidth && y < .28
  const floorEnvelope = underfloor ? gaussian(z, -.25, 2.55) : 0
  const floorAcceleration = floorEnvelope * scenario.floor * (.11 + .13 * geometry.sidepodUndercut) * speedScale
  const floorPull = -floorEnvelope * scenario.floor * .22 * geometry.sidepodUndercut

  const diffuserProgress = underfloor && z < -2.35
    ? Math.max(0, Math.min(1, (-z - 2.35) / 2.1))
    : 0
  const diffuserLift = diffuserProgress * .24 * scenario.floor * geometry.diffuserExpansion
  const diffuserSpread = side * diffuserProgress * .3 * geometry.diffuserExpansion

  const frontWheelWake = z < 2.85
    ? gaussian(absX, 1.55, .26) * Math.exp(-(2.85 - z) / 3.2)
    : 0
  const rearWheelWake = z < -2.75
    ? gaussian(absX, 1.48, .3) * Math.exp(-(-2.75 - z) / 4.1)
    : 0
  const wheelWake = frontWheelWake * .72 + rearWheelWake

  const rearWakeProgress = z < -3.0 ? Math.max(0, Math.min(1, (-z - 3.0) / 4.6)) : 0
  const rearWakeCore = rearWakeProgress * gaussian(absX, 0, 1.36) * scenario.wake
  const wakeDeficit = rearWakeCore * scenario.wakeDeficit * (.82 + .18 * geometry.rearWingCamber)

  const yaw = scenario.yaw * Math.max(0, Math.min(1, (7.8 - z) / 13.8)) * 2.6
  const turbulenceEnvelope = Math.min(1, wheelWake + rearWakeCore)
  const turbulence = Math.sin(seed * 1.91 + z * 3.7 + x * 2.2) * scenario.turbulence * turbulenceEnvelope * .16
  const verticalTurbulence = Math.cos(seed * 2.37 + z * 3.1) * scenario.turbulence * turbulenceEnvelope * .055

  return {
    dx: noseDisplacement + sidepodWash + diffuserSpread + yaw + turbulence,
    dy: floorPull + diffuserLift + verticalTurbulence,
    dz: wakeDeficit * .42,
    speedRatio: Math.max(.45, 1 + floorAcceleration - wakeDeficit * .58 - wheelWake * .09),
    vorticity: scenario.vortex * (wheelWake * .62 + rearWakeCore * .85 + diffuserProgress * .32),
  }
}

/**
 * Advects a streamline from the tunnel inlet toward the downstream collector.
 * This is still a visualization proxy, but unlike a static displacement plot it
 * integrates the local geometry-reactive flow field so disturbances accumulate
 * continuously as the path passes the nose, wheels, floor, diffuser and wake.
 */
export function integrateProxyStreamline(
  startX: number,
  startY: number,
  geometry: TeamGeometryProfile,
  scenario: FlowScenario,
  windRatio: number,
  seed = 0,
  steps = 52,
  stepSceneUnits = .32,
): ProxyStreamlinePoint[] {
  let x = startX
  let y = startY
  let z = 8
  const points: ProxyStreamlinePoint[] = [{ x, y, z }]
  const lateralGain = .16 + .09 * Math.max(0, Math.min(1, windRatio))
  const verticalGain = .13 + .07 * Math.max(0, Math.min(1, windRatio))

  for (let index = 1; index < steps; index += 1) {
    const sample = sampleProxyFlow(x, y, z, geometry, scenario, windRatio, seed + index * .17)
    const axialSpeed = Math.max(.48, sample.speedRatio)

    x += sample.dx * stepSceneUnits * lateralGain
    y += sample.dy * stepSceneUnits * verticalGain
    z -= stepSceneUnits * axialSpeed

    // Keep paths inside the visible test-section envelope while preserving
    // accumulated lateral/yaw and diffuser motion.
    x = Math.max(-4.25, Math.min(4.25, x))
    y = Math.max(-.54, Math.min(3.35, y))
    points.push({ x, y, z })
  }

  return points
}
