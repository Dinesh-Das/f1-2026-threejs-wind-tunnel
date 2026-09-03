import { useEffect } from 'react'
import { Experience } from '../experience/Experience'
import { TopNav } from '../components/ui/TopNav'
import { TeamSelector } from '../components/ui/TeamSelector'
import { DriverSelector } from '../components/ui/DriverSelector'
import { CameraControls } from '../components/ui/CameraControls'
import { AeroControls } from '../components/ui/AeroControls'
import { TechnicalPanel } from '../components/ui/TechnicalPanel'
import { PerformanceSettings } from '../components/ui/PerformanceSettings'
import { Intro } from '../components/ui/LoadingScreen'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { teamById } from '../data/teams'
import { useF1Store } from '../store/useF1Store'

export function App() {
  const entered = useF1Store((s) => s.entered)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const selectedDriverId = useF1Store((s) => s.selectedDriverId)
  const set = useF1Store((s) => s.set)
  const team = teamById(selectedTeamId)

  useKeyboardShortcuts()

  useEffect(() => {
    if (!team.drivers.some((d) => d.id === selectedDriverId)) {
      set({ selectedDriverId: team.drivers[0].id })
    }
  }, [team, selectedDriverId, set])

  return (
    <main className="app-shell" style={{ '--accent': team.primaryColor } as React.CSSProperties}>
      <Experience />
      {!entered ? <Intro /> : (
        <div className="ui-layer">
          <TopNav />
          <TeamSelector />
          <DriverSelector />
          <CameraControls />
          <AeroControls />
          <TechnicalPanel />
          <PerformanceSettings />
          <div className="simulation-note">VISUAL AERODYNAMIC SIMULATION · NOT CFD</div>
        </div>
      )}
    </main>
  )
}
