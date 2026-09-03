import { teamById } from '../../data/teams'
import { useF1Store } from '../../store/useF1Store'

export function TopNav() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const driverId = useF1Store((s) => s.selectedDriverId)
  const set = useF1Store((s) => s.set)
  const team = teamById(teamId)
  const driver = team.drivers.find((d) => d.id === driverId) ?? team.drivers[0]
  return (
    <header className="top-nav">
      <button className="brand" onClick={() => set({ cameraPreset: 'hero' })} aria-label="Reset to hero view">
        <span className="brand-mark">F1</span><span>2026</span>
      </button>
      <nav aria-label="Primary">
        <button onClick={() => set({ aerodynamicMode: false, compareMode: false })}>Garage</button>
        <button onClick={() => set({ aerodynamicMode: true, compareMode: false })}>Aerodynamics</button>
        <button onClick={() => set({ compareMode: true, aerodynamicMode: false })}>Compare</button>
        <button onClick={() => set({ selectedComponent: 'floor' })}>Technical</button>
      </nav>
      <div className="nav-status"><span className="status-dot" /> {team.shortName} / {driver.shortName} <b>#{driver.number}</b></div>
    </header>
  )
}
