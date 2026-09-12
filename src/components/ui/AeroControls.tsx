import { useState } from 'react'
import { useF1Store, type FlowPreset } from '../../store/useF1Store'
import { FLOW_PRESET_SPEED_KMH, FLOW_SCENARIOS } from '../../aerodynamics/core/flowScenarios'
import { carManifestForTeam } from '../../cars/carAssetManifest'

const presets: FlowPreset[] = [
  'Clean Air',
  'Cornering',
  'High Speed',
  'Low Speed',
  'Slipstream Demonstration',
  'Dirty Air',
]

export function AeroControls() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const s = useF1Store()
  const set = s.set
  const manifest = carManifestForTeam(s.selectedTeamId)
  const hasValidatedAeroMotion = Boolean(manifest.activeAero.front && manifest.activeAero.rear)
  return (
    <>
      {s.aerodynamicMode && (
        <button
          className="aero-panel-toggle"
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="aero-panel"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? 'CLOSE AERO' : 'AERO CONTROLS'}
        </button>
      )}
      <aside
        id="aero-panel"
        className={`aero-panel ${s.aerodynamicMode ? 'is-open' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
      >
        <div className="panel-kicker">AERODYNAMICS / VISUAL SIMULATION</div>
        <div className="control-section-title">PHYSICAL / SCENARIO</div>
        <button
          className={`wind-toggle ${s.windTunnel ? 'is-active' : ''}`}
          onClick={() => set({ windTunnel: !s.windTunnel, aerodynamicMode: true })}
        >
          <span>WIND TUNNEL</span>
          <b>{s.windTunnel ? 'ON' : 'OFF'}</b>
        </button>
        <label className="slider-row">
          <span>
            WIND SPEED <b>{s.windSpeed} KM/H</b>
          </span>
          <input
            type="range"
            min="0"
            max="350"
            step="10"
            value={s.windSpeed}
            onChange={(e) => set({ windSpeed: Number(e.target.value), windTunnel: true })}
          />
        </label>
        <label className="slider-row">
          <span>
            YAW ANGLE{' '}
            <b>
              {s.yawDeg > 0 ? '+' : ''}
              {s.yawDeg.toFixed(1)}°
            </b>
          </span>
          <input
            type="range"
            min="-10"
            max="10"
            step="0.5"
            value={s.yawDeg}
            onChange={(e) => set({ yawDeg: Number(e.target.value), windTunnel: true })}
          />
        </label>
        <div className="density-row">
          <span>FLOW SCENARIO</span>
          <select
            value={s.flowPreset}
            onChange={(e) => {
              const flowPreset = e.target.value as FlowPreset
              set({
                flowPreset,
                windSpeed: FLOW_PRESET_SPEED_KMH[flowPreset],
                yawDeg: FLOW_SCENARIOS[flowPreset].yawDeg,
                windTunnel: true,
              })
            }}
          >
            {presets.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="segmented">
          <button
            className={s.activeAeroState === 'Corner' ? 'is-active' : ''}
            onClick={() => set({ activeAeroState: 'Corner', windTunnel: true })}
          >
            CORNER MODE
          </button>
          <button
            className={s.activeAeroState === 'Straight' ? 'is-active' : ''}
            onClick={() => set({ activeAeroState: 'Straight', windTunnel: true })}
          >
            STRAIGHT MODE
          </button>
        </div>
        <div className="toggle-grid control-grid-spaced">
          <Toggle label="Rolling road" on={s.rollingRoad} change={() => set({ rollingRoad: !s.rollingRoad })} />
          <Toggle label="Wheel rotation" on={s.wheelRotation} change={() => set({ wheelRotation: !s.wheelRotation })} />
        </div>

        <div className="control-section-title">VISUALIZATION</div>
        <div className="toggle-grid">
          <Toggle label="Flow particles" on={s.flowParticles} change={() => set({ flowParticles: !s.flowParticles })} />
          <Toggle label="Streamlines" on={s.streamlines} change={() => set({ streamlines: !s.streamlines })} />
          <Toggle
            label="Velocity vectors"
            on={s.velocityField}
            change={() => set({ velocityField: !s.velocityField })}
          />
          <Toggle
            label="Relative pressure"
            on={s.pressureField}
            change={() => set({ pressureField: !s.pressureField })}
          />
          <Toggle label="Vorticity" on={s.vortices} change={() => set({ vortices: !s.vortices })} />
          <Toggle label="Wake deficit" on={s.wakeField} change={() => set({ wakeField: !s.wakeField })} />
          <Toggle label="Underfloor flow" on={s.groundEffect} change={() => set({ groundEffect: !s.groundEffect })} />
          <Toggle label="Center slice" on={s.slicePlane} change={() => set({ slicePlane: !s.slicePlane })} />
          <Toggle label="Flow probe" on={s.flowProbe} change={() => set({ flowProbe: !s.flowProbe })} />
        </div>
        <div className="density-row">
          <span>PARTICLE DENSITY</span>
          <select
            value={s.particleDensity}
            onChange={(e) => set({ particleDensity: e.target.value as typeof s.particleDensity })}
          >
            {['Low', 'Medium', 'High', 'Ultra'].map((density) => (
              <option key={density}>{density}</option>
            ))}
          </select>
        </div>
        <div className="density-row">
          <span>STREAMLINE DENSITY</span>
          <select
            value={s.streamlineDensity}
            onChange={(e) => set({ streamlineDensity: e.target.value as typeof s.streamlineDensity })}
          >
            {['Low', 'Medium', 'High', 'Ultra'].map((density) => (
              <option key={density}>{density}</option>
            ))}
          </select>
        </div>
        {s.pressureField && (
          <div className="pressure-legend" aria-label="Relative pressure estimate legend">
            <span>LOW</span>
            <i />
            <span>HIGH</span>
            <small>RELATIVE PRESSURE ESTIMATE · NOT Cp</small>
          </div>
        )}

        <div className="control-section-title">ENGINEERING VIEW</div>
        <div className="engineering-actions">
          <button className={s.exploded ? 'is-active' : ''} onClick={() => set({ exploded: !s.exploded })}>
            EXPLODED VIEW
          </button>
          <button
            className={s.floorView ? 'is-active' : ''}
            onClick={() => {
              const floorView = !s.floorView
              set({
                floorView,
                cameraPreset: floorView ? 'floor' : 'hero',
                selectedComponent: null,
                turntable: !floorView,
              })
            }}
          >
            ISOLATE FLOOR
          </button>
          <button className={s.xray ? 'is-active' : ''} onClick={() => set({ xray: !s.xray })}>
            X-RAY
          </button>
        </div>
        <div className="hud-mini">
          <span>FLOW MODEL</span>
          <b>GEOMETRY-AWARE REALTIME APPROXIMATION</b>
          <span>CFD DATA</span>
          <b>NONE LOADED</b>
          <span>ACTIVE-AERO MESH</span>
          <b>{hasValidatedAeroMotion ? 'MANIFEST MAPPED' : 'FALLBACK HAS NO VALIDATED FLAP PIVOTS'}</b>
        </div>
      </aside>
    </>
  )
}

function Toggle({ label, on, change }: { label: string; on: boolean; change: () => void }) {
  return (
    <button className={on ? 'is-active' : ''} onClick={change}>
      <span>{label}</span>
      <i>{on ? 'ON' : 'OFF'}</i>
    </button>
  )
}
