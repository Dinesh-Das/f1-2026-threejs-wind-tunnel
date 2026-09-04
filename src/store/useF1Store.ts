import { create } from 'zustand'

export type CameraPreset = 'hero'|'front'|'rear'|'left'|'right'|'top'|'frontWing'|'rearWing'|'floor'|'diffuser'|'cockpit'|'suspension'|'onboard'|'engineering'
export type Quality = 'LOW'|'MEDIUM'|'HIGH'|'ULTRA'
export type EnvironmentName = 'F1 Studio'|'Wind Tunnel'|'Night Garage'|'Daylight'|'Track Pit Lane'|'Black Void'
export type FlowPreset = 'Clean Air'|'Cornering'|'High Speed'|'Low Speed'|'Slipstream Demonstration'|'Dirty Air'

type State = {
  entered: boolean
  selectedTeamId: string
  selectedDriverId: string
  compareTeamId: string
  compareMode: boolean
  selectedComponent: string | null
  cameraPreset: CameraPreset
  environment: EnvironmentName
  quality: Quality
  aerodynamicMode: boolean
  windTunnel: boolean
  windSpeed: number
  streamlines: boolean
  streamlineDensity: 'Low'|'Medium'|'High'|'Ultra'
  vortices: boolean
  pressureMap: boolean
  velocityField: boolean
  groundEffect: boolean
  exploded: boolean
  xray: boolean
  floorView: boolean
  activeAero: boolean
  activeAeroState: 'Corner'|'Straight'
  flowPreset: FlowPreset
  turntable: boolean
  turntableDirection: 1|-1
  turntableSpeed: number
  cinematic: boolean
  reducedMotion: boolean
  set: (patch: Partial<Omit<State, 'set'>>) => void
  selectTeam: (teamId: string, firstDriverId: string) => void
}

const savedTeam = typeof localStorage !== 'undefined' ? localStorage.getItem('f1-2026-team') : null
const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const autoEnter = queryParams?.get('autostart') === '1'
const autoWindTunnel = queryParams?.get('windtunnel') === '1'
const autoAerodynamicMode = autoWindTunnel || queryParams?.get('aero') === '1'
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function normalizePatch(patch: Partial<Omit<State, 'set'>>) {
  if (patch.compareMode === true) {
    return { ...patch, aerodynamicMode: false }
  }
  if (patch.windTunnel === true) {
    return { ...patch, aerodynamicMode: true, compareMode: false }
  }
  if (patch.aerodynamicMode === true) {
    return { ...patch, compareMode: false }
  }
  return patch
}

export const useF1Store = create<State>((set) => ({
  entered: autoEnter,
  selectedTeamId: savedTeam || 'mclaren',
  selectedDriverId: 'norris',
  compareTeamId: 'ferrari',
  compareMode: false,
  selectedComponent: null,
  cameraPreset: 'hero',
  environment: 'F1 Studio',
  quality: 'ULTRA',
  aerodynamicMode: autoAerodynamicMode,
  windTunnel: autoWindTunnel,
  windSpeed: 250,
  streamlines: true,
  streamlineDensity: 'Medium',
  vortices: true,
  pressureMap: false,
  velocityField: false,
  groundEffect: false,
  exploded: false,
  xray: false,
  floorView: false,
  activeAero: false,
  activeAeroState: 'Corner',
  flowPreset: 'High Speed',
  turntable: true,
  turntableDirection: 1,
  turntableSpeed: .18,
  cinematic: false,
  reducedMotion: prefersReducedMotion,
  set: (patch) => set(normalizePatch(patch)),
  selectTeam: (teamId, firstDriverId) => {
    localStorage.setItem('f1-2026-team', teamId)
    set({ selectedTeamId: teamId, selectedDriverId: firstDriverId, selectedComponent: null })
  },
}))
