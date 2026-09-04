import type { FlowPreset } from '../store/useF1Store'

export type FlowScenario = {
  yaw: number
  turbulence: number
  wake: number
  floor: number
  vortex: number
  lateralDeflection: number
}

export const FLOW_SCENARIOS: Record<FlowPreset, FlowScenario> = {
  'Clean Air': { yaw: 0, turbulence: .08, wake: .35, floor: .72, vortex: .48, lateralDeflection: .72 },
  Cornering: { yaw: .16, turbulence: .3, wake: .72, floor: .62, vortex: .82, lateralDeflection: .9 },
  'High Speed': { yaw: 0, turbulence: .12, wake: .55, floor: 1, vortex: .68, lateralDeflection: .82 },
  'Low Speed': { yaw: 0, turbulence: .18, wake: .42, floor: .45, vortex: .42, lateralDeflection: .62 },
  'Slipstream Demonstration': { yaw: 0, turbulence: .4, wake: 1, floor: .78, vortex: .9, lateralDeflection: .56 },
  'Dirty Air': { yaw: .05, turbulence: .72, wake: 1, floor: .65, vortex: 1, lateralDeflection: 1 },
}

export const FLOW_PRESET_SPEED_KMH: Record<FlowPreset, number> = {
  'Clean Air': 200,
  Cornering: 150,
  'High Speed': 300,
  'Low Speed': 100,
  'Slipstream Demonstration': 280,
  'Dirty Air': 220,
}

