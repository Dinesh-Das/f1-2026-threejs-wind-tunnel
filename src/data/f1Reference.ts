import type { TeamGeometryProfile } from './teams'

export const F1_2026_REFERENCE = {
  // The proxy uses public 2026 regulation / tyre reference dimensions only.
  maxWheelbaseM: 3.4,
  maxWidthM: 1.9,
  rimDiameterM: 0.463,
  frontTyreWidthM: 0.28,
  rearTyreWidthM: 0.375,
  frontTyreDiameterM: 0.705,
  rearTyreDiameterM: 0.71,
  frontWingNarrowingM: 0.1,
  airDensityKgM3: 1.225,
  airDynamicViscosityPaS: 1.81e-5,
  speedOfSoundMs: 343,
  // Public team-specific coefficients are not available. These values are an
  // engineering proxy used only to make the simulator respond with realistic
  // q = 1/2 rho v^2 load scaling rather than claiming measured 2026 telemetry.
  proxyFrontalAreaM2: 1.45,
  proxyDragCoefficientCorner: .92,
  proxyDragCoefficientStraight: .70,
  proxyDownforceCoefficientCorner: 2.8,
  proxyDownforceCoefficientStraight: 2.0,
  sceneUnitsPerMetre: 2,
} as const

export const toSceneUnits = (metres: number) => metres * F1_2026_REFERENCE.sceneUnitsPerMetre

export function freeStreamData(windSpeedKmh: number) {
  const speedMs = windSpeedKmh / 3.6
  const dynamicPressurePa = 0.5 * F1_2026_REFERENCE.airDensityKgM3 * speedMs * speedMs
  return {
    speedMs,
    dynamicPressureKpa: dynamicPressurePa / 1000,
    mach: speedMs / F1_2026_REFERENCE.speedOfSoundMs,
  }
}

export function reynoldsNumber(windSpeedKmh: number, characteristicLengthM = F1_2026_REFERENCE.maxWheelbaseM) {
  const { speedMs } = freeStreamData(windSpeedKmh)
  return F1_2026_REFERENCE.airDensityKgM3 * speedMs * characteristicLengthM
    / F1_2026_REFERENCE.airDynamicViscosityPaS
}

export function wheelKinematics(windSpeedKmh: number) {
  const speedMs = windSpeedKmh / 3.6
  const rpmForDiameter = (diameterM: number) => speedMs / (Math.PI * diameterM) * 60
  return {
    frontRpm: rpmForDiameter(F1_2026_REFERENCE.frontTyreDiameterM),
    rearRpm: rpmForDiameter(F1_2026_REFERENCE.rearTyreDiameterM),
  }
}

export function aeroProxyLoads(windSpeedKmh: number, activeAeroState: 'Corner' | 'Straight') {
  const { speedMs } = freeStreamData(windSpeedKmh)
  const dynamicPressurePa = .5 * F1_2026_REFERENCE.airDensityKgM3 * speedMs * speedMs
  const straight = activeAeroState === 'Straight'
  const dragCoefficient = straight
    ? F1_2026_REFERENCE.proxyDragCoefficientStraight
    : F1_2026_REFERENCE.proxyDragCoefficientCorner
  const downforceCoefficient = straight
    ? F1_2026_REFERENCE.proxyDownforceCoefficientStraight
    : F1_2026_REFERENCE.proxyDownforceCoefficientCorner
  const area = F1_2026_REFERENCE.proxyFrontalAreaM2

  return {
    dragCoefficient,
    downforceCoefficient,
    dragN: dynamicPressurePa * dragCoefficient * area,
    downforceN: dynamicPressurePa * downforceCoefficient * area,
  }
}

export function aeroProxyEnvelope(
  windSpeedKmh: number,
  activeAeroState: 'Corner' | 'Straight',
  geometry: TeamGeometryProfile,
  yawRadians = 0,
  wakeDeficit = 0,
) {
  const base = aeroProxyLoads(windSpeedKmh, activeAeroState)
  const yawPenalty = Math.min(.16, Math.abs(yawRadians) * .42)
  const floorEfficiency = Math.max(.82, Math.min(1.16,
    .95 + (geometry.sidepodUndercut - 1) * .22 + (geometry.diffuserExpansion - 1) * .18,
  ))
  const wingBias = (geometry.frontWingCamber - geometry.rearWingCamber) * .07
  const frontShare = Math.max(.41, Math.min(.49, .455 + wingBias - yawPenalty * .08))
  const effectiveDownforceN = base.downforceN * floorEfficiency * (1 - yawPenalty) * (1 - wakeDeficit * .22)
  const effectiveDragN = base.dragN * (1 + Math.abs(yawRadians) * .12) * (1 + wakeDeficit * .08)

  return {
    ...base,
    effectiveDragN,
    effectiveDownforceN,
    floorEfficiency,
    frontShare,
    rearShare: 1 - frontShare,
    frontDownforceN: effectiveDownforceN * frontShare,
    rearDownforceN: effectiveDownforceN * (1 - frontShare),
  }
}
