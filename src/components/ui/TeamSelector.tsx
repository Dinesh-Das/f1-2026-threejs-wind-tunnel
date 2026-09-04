import { teams } from '../../data/teams'
import { useF1Store } from '../../store/useF1Store'

export function TeamSelector() {
  const selected = useF1Store((s) => s.selectedTeamId)
  const selectTeam = useF1Store((s) => s.selectTeam)
  return (
    <aside className="team-rail" aria-label="Formula 1 teams">
      <div className="rail-label">CONSTRUCTORS / 11</div>
      <div className="team-list">
        {teams.map((team, index) => (
          <button
            key={team.id}
            className={`team-item ${selected === team.id ? 'is-active' : ''}`}
            onClick={() => selectTeam(team.id, team.drivers[0].id)}
            aria-label={`Select ${team.name}`}
          >
            <span className="team-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="team-swatch" style={{ background: `linear-gradient(180deg, ${team.livery.accent}, ${team.primaryColor})` }} />
            <img className="team-logo" src={team.logo} alt="" aria-hidden="true" />
            <span>{team.shortName}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
