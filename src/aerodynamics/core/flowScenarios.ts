import type { FlowPreset } from '../../store/useF1Store'

export type FlowScenario = {
  yawDeg: number
  turbulence: number
  wakeStrength: number
  floorStrength: number
  vorticityStrength: number
  wakeDeficit: number
}

export const FLOW_SCENARIOS: Record<FlowPreset, FlowScenario> = {
  'Clean Air': {
    yawDeg: 0,
    turbulence: 0.03,
    wakeStrength: 0.3,
    floorStrength: 0.72,
    vorticityStrength: 0.45,
    wakeDeficit: 0.1,
  },
  Cornering: {
    yawDeg: 6,
    turbulence: 0.18,
    wakeStrength: 0.66,
    floorStrength: 0.62,
    vorticityStrength: 0.8,
    wakeDeficit: 0.22,
  },
  'High Speed': {
    yawDeg: 0,
    turbulence: 0.06,
    wakeStrength: 0.48,
    floorStrength: 1,
    vorticityStrength: 0.65,
    wakeDeficit: 0.15,
  },
  'Low Speed': {
    yawDeg: 0,
    turbulence: 0.08,
    wakeStrength: 0.34,
    floorStrength: 0.45,
    vorticityStrength: 0.4,
    wakeDeficit: 0.08,
  },
  'Slipstream Demonstration': {
    yawDeg: 0,
    turbulence: 0.22,
    wakeStrength: 1,
    floorStrength: 0.78,
    vorticityStrength: 0.88,
    wakeDeficit: 0.42,
  },
  'Dirty Air': {
    yawDeg: 2,
    turbulence: 0.5,
    wakeStrength: 1,
    floorStrength: 0.65,
    vorticityStrength: 1,
    wakeDeficit: 0.34,
  },
}

export const FLOW_PRESET_SPEED_KMH: Record<FlowPreset, number> = {
  'Clean Air': 200,
  Cornering: 150,
  'High Speed': 300,
  'Low Speed': 100,
  'Slipstream Demonstration': 280,
  'Dirty Air': 220,
}
