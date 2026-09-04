import { teams, teamById } from '../../data/teams'
import { F1_2026_REFERENCE, freeStreamData } from '../../data/f1Reference'
import { useF1Store } from '../../store/useF1Store'

const copy: Record<string, [string, string, ...string[]]> = {
  frontWing: ['FRONT WING','Generates front downforce and conditions airflow for downstream surfaces.','Front axle load','Wheel-wake management','Downstream flow conditioning'],
  nose: ['NOSE','Structures the leading aerodynamic flow and supports front-wing interaction.','Flow attachment','Front-wing feed','Impact structure envelope'],
  sidepods: ['SIDEPODS','Guide cooling flow while shaping external airflow toward the rear of the car.','Cooling inlet','Bodywork wash','Rearward flow conditioning'],
  floor: ['FLOOR','Shapes underbody airflow and pressure distribution within this regulation-scaled 2026 proxy.','Floor entrance','Underbody flow acceleration','Edge-flow visualization'],
  diffuser: ['DIFFUSER','Expands accelerated underfloor flow and manages pressure recovery at the rear.','Pressure recovery','Underfloor extraction','Rear wake interaction'],
  rearWing: ['REAR WING','Produces rear downforce and strongly influences the trailing wake.','Rear axle load','Wake structure','Active-aero demonstration'],
  suspension: ['SUSPENSION','Locates the wheels and affects both mechanical response and exposed airflow.','Wheel control','Aero interference','Geometry visibility'],
  halo: ['HALO','Driver-protection structure integrated into the cockpit airflow region.','Driver protection','Cockpit flow interaction','Structural envelope'],
  wheels: ['WHEELS','Rotating wheel assemblies generate complex wakes that influence downstream aerodynamics.','Wheel wake','Brake cooling','Tire flow interaction'],
}

export function TechnicalPanel() {
  const s = useF1Store()
  const team = teamById(s.selectedTeamId)
  const driver = team.drivers.find((d) => d.id === s.selectedDriverId) ?? team.drivers[0]
  const selected = s.selectedComponent ? copy[s.selectedComponent] : null
  const freeStream = freeStreamData(s.windSpeed)
  return (
    <aside className="technical-panel">
      <div className="telemetry-head"><span>CAR / 2026</span><span>INTERACTIVE 3D</span></div>
      <h2>{team.shortName}</h2>
      <p className="constructor">{team.constructor} · {team.powerUnit} power</p>
      <div className="driver-card"><strong>{driver.name}</strong><span>#{driver.number} · {driver.nationality}</span></div>
      {selected ? <div className="component-copy"><span className="panel-kicker">SELECTED COMPONENT</span><h3>{selected[0]}</h3><p>{selected[1]}</p><ul>{selected.slice(2).map((item) => <li key={item}>— {item}</li>)}</ul><small>Technical description is generic and does not claim confidential team-specific data.</small></div> : <div className="component-copy"><span className="panel-kicker">INSPECTION</span><h3>SELECT A COMPONENT</h3><p>Click a highlighted car component or choose a camera preset to move from showroom view into engineering inspection.</p></div>}
      <div className="compare-block"><span>COMPARISON</span><button className={s.compareMode ? 'is-active' : ''} onClick={() => s.set({ compareMode: !s.compareMode })}>{s.compareMode ? 'EXIT COMPARE' : 'COMPARE CAR'}</button>{s.compareMode && <select value={s.compareTeamId} onChange={(e) => s.set({ compareTeamId: e.target.value })}>{teams.filter((t) => t.id !== team.id).map((t) => <option value={t.id} key={t.id}>{t.shortName}</option>)}</select>}</div>
      {s.aerodynamicMode && <>
        <div className="data-truth"><b>FREE STREAM</b><span>{s.windSpeed} km/h · {freeStream.speedMs.toFixed(1)} m/s</span></div>
        <div className="data-truth"><b>DYNAMIC PRESSURE</b><span>{freeStream.dynamicPressureKpa.toFixed(2)} kPa derived</span></div>
        <div className="data-truth"><b>AIR DENSITY</b><span>{F1_2026_REFERENCE.airDensityKgM3.toFixed(3)} kg/m³ assumed</span></div>
      </>}
      <div className="data-truth"><b>MODEL STATUS</b><span>{team.reference_based_approximation ? '2026 REGULATION PROXY · OFFICIAL TEAM MARKS' : 'AUTHORIZED PRODUCTION ASSET'}</span></div>
    </aside>
  )
}
