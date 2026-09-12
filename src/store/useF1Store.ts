import { create } from 'zustand'
import { teams } from '../data/teams'

export type CameraPreset =
  | 'hero'
  | 'rearThreeQuarter'
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'top'
  | 'frontWing'
  | 'sidepod'
  | 'rearWing'
  | 'floor'
  | 'diffuser'
  | 'cockpit'
  | 'suspension'
  | 'onboard'
  | 'engineering'
export type Quality = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'
export type FlowDensity = 'Low' | 'Medium' | 'High' | 'Ultra'
export type FlowPreset =
  'Clean Air' | 'Cornering' | 'High Speed' | 'Low Speed' | 'Slipstream Demonstration' | 'Dirty Air'

type State = {
  entered: boolean
  selectedTeamId: string
  selectedDriverId: string
  compareTeamId: string
  compareMode: boolean
  selectedComponent: string | null
  cameraPreset: CameraPreset
  quality: Quality
  aerodynamicMode: boolean
  windTunnel: boolean
  windSpeed: number
  yawDeg: number
  rollingRoad: boolean
  wheelRotation: boolean
  flowParticles: boolean
  particleDensity: FlowDensity
  streamlines: boolean
  streamlineDensity: FlowDensity
  vortices: boolean
  velocityField: boolean
  pressureField: boolean
  wakeField: boolean
  slicePlane: boolean
  flowProbe: boolean
  groundEffect: boolean
  exploded: boolean
  xray: boolean
  floorView: boolean
  activeAeroState: 'Corner' | 'Straight'
  flowPreset: FlowPreset
  turntable: boolean
  turntableDirection: 1 | -1
  turntableSpeed: number
  cinematic: boolean
  reducedMotion: boolean
  set: (patch: Partial<Omit<State, 'set'>>) => void
  selectTeam: (teamId: string, firstDriverId: string) => void
}

const TEAM_STORAGE_KEY = 'f1-2026-team'

function readSavedTeam() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TEAM_STORAGE_KEY) : null
  } catch {
    return null
  }
}

function persistSelectedTeam(teamId: string) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TEAM_STORAGE_KEY, teamId)
  } catch {
    // Persistence is optional. Browsers can deny storage access in hardened or
    // sandboxed contexts; team selection must still work for the current session.
  }
}

const savedTeam = readSavedTeam()
const initialTeam = teams.find((team) => team.id === savedTeam) ?? teams[0]
const initialCompareTeam =
  teams.find((team) => team.id === 'ferrari' && team.id !== initialTeam.id) ??
  teams.find((team) => team.id !== initialTeam.id) ??
  initialTeam
const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const autoEnter = queryParams?.get('autostart') === '1'
const autoWindTunnel = queryParams?.get('windtunnel') === '1'
const autoAerodynamicMode = autoWindTunnel || queryParams?.get('aero') === '1'
const prefersReducedMotion =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false

function normalizePatch(patch: Partial<Omit<State, 'set'>>) {
  if (patch.compareMode === true) {
    return { ...patch, aerodynamicMode: false, windTunnel: false }
  }
  if (patch.windTunnel === true) {
    return { ...patch, aerodynamicMode: true, compareMode: false }
  }
  if (patch.aerodynamicMode === true) {
    return { ...patch, compareMode: false }
  }
  if (patch.aerodynamicMode === false) {
    return { ...patch, windTunnel: false }
  }
  return patch
}

export const useF1Store = create<State>((set) => ({
  entered: autoEnter,
  selectedTeamId: initialTeam.id,
  selectedDriverId: initialTeam.drivers[0].id,
  compareTeamId: initialCompareTeam.id,
  compareMode: false,
  selectedComponent: null,
  cameraPreset: 'hero',
  quality: 'HIGH',
  aerodynamicMode: autoAerodynamicMode,
  windTunnel: autoWindTunnel,
  windSpeed: 250,
  yawDeg: 0,
  rollingRoad: true,
  wheelRotation: true,
  flowParticles: true,
  particleDensity: 'High',
  streamlines: true,
  streamlineDensity: 'Medium',
  vortices: true,
  velocityField: false,
  pressureField: false,
  wakeField: true,
  slicePlane: false,
  flowProbe: false,
  groundEffect: false,
  exploded: false,
  xray: false,
  floorView: false,
  activeAeroState: 'Corner',
  flowPreset: 'High Speed',
  turntable: true,
  turntableDirection: 1,
  turntableSpeed: 0.18,
  cinematic: false,
  reducedMotion: prefersReducedMotion,
  set: (patch) => set(normalizePatch(patch)),
  selectTeam: (teamId, firstDriverId) => {
    const team = teams.find((candidate) => candidate.id === teamId)
    if (!team) return
    const driverId = team.drivers.some((driver) => driver.id === firstDriverId) ? firstDriverId : team.drivers[0].id
    persistSelectedTeam(team.id)
    set((state) => ({
      selectedTeamId: team.id,
      selectedDriverId: driverId,
      compareTeamId:
        state.compareTeamId === team.id
          ? (teams.find((candidate) => candidate.id !== team.id)?.id ?? state.compareTeamId)
          : state.compareTeamId,
      selectedComponent: null,
    }))
  },
}))
