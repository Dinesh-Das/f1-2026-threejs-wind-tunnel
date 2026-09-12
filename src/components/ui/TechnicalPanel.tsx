import { useState } from 'react'
import { teams, teamById } from '../../data/teams'
import { F1_2026_REFERENCE, freeStreamData, reynoldsNumber, wheelKinematics } from '../../data/f1Reference'
import { carManifestForTeam, manifestAccuracyLabel } from '../../cars/carAssetManifest'
import { useF1Store } from '../../store/useF1Store'

const copy: Record<string, [string, string, ...string[]]> = {
  frontWing: [
    'FRONT WING',
    'Generates front downforce and conditions airflow for downstream surfaces.',
    'Front axle load',
    'Wheel-wake management',
    'Downstream flow conditioning',
  ],
  nose: [
    'NOSE',
    'Structures the leading aerodynamic flow and supports front-wing interaction.',
    'Flow attachment',
    'Front-wing feed',
    'Impact structure envelope',
  ],
  sidepods: [
    'SIDEPODS',
    'Guide cooling flow while shaping external airflow toward the rear of the car.',
    'Cooling inlet',
    'Bodywork wash',
    'Rearward flow conditioning',
  ],
  floor: [
    'FLOOR',
    'Shapes underbody airflow and pressure distribution within this regulation-scaled 2026 proxy.',
    'Floor entrance',
    'Underbody flow acceleration',
    'Edge-flow visualization',
  ],
  diffuser: [
    'DIFFUSER',
    'Expands accelerated underfloor flow and manages pressure recovery at the rear.',
    'Pressure recovery',
    'Underfloor extraction',
    'Rear wake interaction',
  ],
  rearWing: [
    'REAR WING',
    'Produces rear downforce and strongly influences the trailing wake.',
    'Rear axle load',
    'Wake structure',
    'Active-aero demonstration',
  ],
  suspension: [
    'SUSPENSION',
    'Locates the wheels and affects both mechanical response and exposed airflow.',
    'Wheel control',
    'Aero interference',
    'Geometry visibility',
  ],
  halo: [
    'HALO',
    'Driver-protection structure integrated into the cockpit airflow region.',
    'Driver protection',
    'Cockpit flow interaction',
    'Structural envelope',
  ],
  wheels: [
    'WHEELS',
    'Rotating wheel assemblies generate complex wakes that influence downstream aerodynamics.',
    'Wheel wake',
    'Brake cooling',
    'Tire flow interaction',
  ],
}

export function TechnicalPanel() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const s = useF1Store()
  const team = teamById(s.selectedTeamId)
  const manifest = carManifestForTeam(team.id)
  const driver = team.drivers.find((d) => d.id === s.selectedDriverId) ?? team.drivers[0]
  const selected = s.selectedComponent ? copy[s.selectedComponent] : null
  const activeWindSpeed = s.windTunnel ? s.windSpeed : 0
  const freeStream = freeStreamData(activeWindSpeed)
  const reynolds = reynoldsNumber(activeWindSpeed)
  const wheels = wheelKinematics(activeWindSpeed)
  const aeroState = s.activeAeroState
  const hasValidatedAeroMotion = Boolean(manifest.activeAero.front && manifest.activeAero.rear)
  return (
    <>
      <button
        className="technical-panel-toggle"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="technical-panel"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? 'CLOSE INFO' : 'CAR INFO'}
      </button>
      <aside id="technical-panel" className={`technical-panel ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="telemetry-head">
          <span>CAR / 2026</span>
          <span>INTERACTIVE 3D</span>
        </div>
        <h2>{team.shortName}</h2>
        <p className="constructor">
          {team.constructor} · {team.powerUnit} power
        </p>
        <div className="driver-card">
          <strong>{driver.name}</strong>
          <span>
            #{driver.number} · {driver.nationality}
          </span>
        </div>
        {selected ? (
          <div className="component-copy">
            <span className="panel-kicker">SELECTED COMPONENT</span>
            <h3>{selected[0]}</h3>
            <p>{selected[1]}</p>
            <ul>
              {selected.slice(2).map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
            <small>Technical description is generic and does not claim confidential team-specific data.</small>
          </div>
        ) : (
          <div className="component-copy">
            <span className="panel-kicker">INSPECTION</span>
            <h3>SELECT A COMPONENT</h3>
            <p>
              Click a highlighted car component or choose a camera preset to move from showroom view into engineering
              inspection.
            </p>
          </div>
        )}
        <div className="compare-block">
          <span>COMPARISON</span>
          <button className={s.compareMode ? 'is-active' : ''} onClick={() => s.set({ compareMode: !s.compareMode })}>
            {s.compareMode ? 'EXIT COMPARE' : 'COMPARE CAR'}
          </button>
          {s.compareMode && (
            <select value={s.compareTeamId} onChange={(e) => s.set({ compareTeamId: e.target.value })}>
              {teams
                .filter((t) => t.id !== team.id)
                .map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.shortName}
                  </option>
                ))}
            </select>
          )}
        </div>
        {s.aerodynamicMode && (
          <>
            <div className="data-truth">
              <b>AERO MODE</b>
              <span>{aeroState === 'Straight' ? 'STRAIGHT MODE' : 'CORNER MODE'} · APPROXIMATION INPUT</span>
            </div>
            <div className="data-truth">
              <b>ACTIVE-AERO GEOMETRY</b>
              <span>{hasValidatedAeroMotion ? 'MANIFEST-MAPPED FLAPS' : 'NOT AVAILABLE IN FALLBACK ASSET'}</span>
            </div>
            <div className="data-truth">
              <b>FLOW MODEL</b>
              <span>GEOMETRY-AWARE REALTIME APPROXIMATION · NOT CFD</span>
            </div>
            <div className="data-truth">
              <b>YAW INPUT</b>
              <span>
                {s.yawDeg > 0 ? '+' : ''}
                {s.yawDeg.toFixed(1)}°
              </span>
            </div>
            <div className="data-truth">
              <b>FREE STREAM</b>
              <span>
                {activeWindSpeed} km/h · {freeStream.speedMs.toFixed(1)} m/s
              </span>
            </div>
            <div className="data-truth">
              <b>DYNAMIC PRESSURE</b>
              <span>{freeStream.dynamicPressureKpa.toFixed(2)} kPa derived</span>
            </div>
            <div className="data-truth">
              <b>FLOW REGIME</b>
              <span>
                Mach {freeStream.mach.toFixed(2)} · Re {(reynolds / 1e6).toFixed(1)}M derived
              </span>
            </div>
            <div className="data-truth">
              <b>AIR DENSITY</b>
              <span>{F1_2026_REFERENCE.airDensityKgM3.toFixed(3)} kg/m³ assumed</span>
            </div>
            <div className="data-truth">
              <b>ROLLING ROAD</b>
              <span>{s.rollingRoad && s.windTunnel && s.windSpeed > 0 ? 'MATCHED TO FREE STREAM' : 'STOPPED'}</span>
            </div>
            <div className="data-truth">
              <b>WHEEL SPEED</b>
              <span>
                {s.wheelRotation
                  ? `F ${Math.round(wheels.frontRpm)} · R ${Math.round(wheels.rearRpm)} rpm derived`
                  : 'ROTATION DISABLED'}
              </span>
            </div>
            <div className="data-truth">
              <b>CFD DATASET</b>
              <span>
                {manifest.cfdDatasets?.length ? `${manifest.cfdDatasets.length} DATASET(S) DECLARED` : 'NONE PROVIDED'}
              </span>
            </div>
          </>
        )}
        <div className="data-truth">
          <b>MODEL STATUS</b>
          <span>
            {manifestAccuracyLabel(manifest)}
            {manifest.fallbackForTeam ? ' · SHARED FALLBACK' : ''}
          </span>
        </div>
        <div className="data-truth">
          <b>MODEL SOURCE</b>
          <span>
            {manifest.source.title}
            {manifest.source.author ? ` · ${manifest.source.author}` : ''}
          </span>
        </div>
        <div className="data-truth">
          <b>LICENSE</b>
          <span>
            {manifest.license.name}
            {manifest.license.attributionRequired ? ' · ATTRIBUTION REQUIRED' : ''}
          </span>
        </div>
        <div className="data-truth">
          <b>REFERENCE</b>
          <span>{manifest.referenceRevision}</span>
        </div>
      </aside>
    </>
  )
}
