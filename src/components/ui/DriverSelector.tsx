import { teamById } from '../../data/teams'
import { useF1Store } from '../../store/useF1Store'

export function DriverSelector() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const driverId = useF1Store((s) => s.selectedDriverId)
  const set = useF1Store((s) => s.set)
  const team = teamById(teamId)
  return (
    <section className="driver-switcher" aria-label="Drivers">
      {team.drivers.map((driver) => (
        <button key={driver.id} className={driver.id === driverId ? 'is-active' : ''} onClick={() => set({ selectedDriverId: driver.id })}>
          <span>{driver.shortName}</span><b>{driver.number}</b>
        </button>
      ))}
    </section>
  )
}
