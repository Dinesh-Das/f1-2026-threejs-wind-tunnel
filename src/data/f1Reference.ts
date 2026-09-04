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
  sceneUnitsPerMetre: 2,
} as const

export const toSceneUnits = (metres: number) => metres * F1_2026_REFERENCE.sceneUnitsPerMetre

export function freeStreamData(windSpeedKmh: number) {
  const speedMs = windSpeedKmh / 3.6
  const dynamicPressurePa = 0.5 * F1_2026_REFERENCE.airDensityKgM3 * speedMs * speedMs
  return {
    speedMs,
    dynamicPressureKpa: dynamicPressurePa / 1000,
  }
}
