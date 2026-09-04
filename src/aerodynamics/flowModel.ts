import type { FlowPreset } from '../store/useF1Store'

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
