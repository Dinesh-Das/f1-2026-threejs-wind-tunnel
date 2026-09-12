export const F1_2026_REFERENCE = {
  // Generic public reference dimensions used for scaling and educational
  // free-stream math. They are not constructor-specific performance data.
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
  return (F1_2026_REFERENCE.airDensityKgM3 * speedMs * characteristicLengthM) / F1_2026_REFERENCE.airDynamicViscosityPaS
}

export function rollingRoadSceneSpeed(windSpeedKmh: number) {
  return freeStreamData(windSpeedKmh).speedMs * F1_2026_REFERENCE.sceneUnitsPerMetre
}

export function wheelAngularVelocityRadS(windSpeedKmh: number, axle: 'front' | 'rear') {
  const diameterM = axle === 'front' ? F1_2026_REFERENCE.frontTyreDiameterM : F1_2026_REFERENCE.rearTyreDiameterM
  const radiusM = diameterM * 0.5
  return radiusM > 0 ? freeStreamData(windSpeedKmh).speedMs / radiusM : 0
}

export function wheelKinematics(windSpeedKmh: number) {
  const speedMs = windSpeedKmh / 3.6
  const rpmForDiameter = (diameterM: number) => (speedMs / (Math.PI * diameterM)) * 60
  return {
    frontRpm: rpmForDiameter(F1_2026_REFERENCE.frontTyreDiameterM),
    rearRpm: rpmForDiameter(F1_2026_REFERENCE.rearTyreDiameterM),
  }
}
