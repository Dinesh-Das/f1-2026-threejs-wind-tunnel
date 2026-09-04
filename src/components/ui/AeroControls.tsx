import { useF1Store, type FlowPreset } from '../../store/useF1Store'
import { FLOW_PRESET_SPEED_KMH } from '../../aerodynamics/flowModel'

const presets: FlowPreset[] = ['Clean Air','Cornering','High Speed','Low Speed','Slipstream Demonstration','Dirty Air']

export function AeroControls() {
  const s = useF1Store()
  const set = s.set
  return (
    <aside className={`aero-panel ${s.aerodynamicMode ? 'is-open' : ''}`}>
      <div className="panel-kicker">AERODYNAMICS / VISUAL SIMULATION</div>
      <button className={`wind-toggle ${s.windTunnel ? 'is-active' : ''}`} onClick={() => set({ windTunnel: !s.windTunnel, aerodynamicMode: true })}>
        <span>WIND TUNNEL</span><b>{s.windTunnel ? 'ON' : 'OFF'}</b>
      </button>
      <label className="slider-row"><span>WIND SPEED <b>{s.windSpeed} KM/H</b></span><input type="range" min="0" max="350" step="10" value={s.windSpeed} onChange={(e) => set({ windSpeed: Number(e.target.value), windTunnel: true })} /></label>
      <div className="toggle-grid">
        <Toggle label="Streamlines" on={s.streamlines} change={() => set({ streamlines: !s.streamlines })} />
        <Toggle label="Vortices" on={s.vortices} change={() => set({ vortices: !s.vortices })} />
        <Toggle label="Pressure cue" on={s.pressureMap} change={() => set({ pressureMap: !s.pressureMap })} />
        <Toggle label="Velocity field" on={s.velocityField} change={() => set({ velocityField: !s.velocityField })} />
        <Toggle label="Underfloor flow" on={s.groundEffect} change={() => set({ groundEffect: !s.groundEffect })} />
        <Toggle label="X-Ray" on={s.xray} change={() => set({ xray: !s.xray })} />
      </div>
      <div className="density-row"><span>FLOW SCENARIO</span><select value={s.flowPreset} onChange={(e) => {
        const flowPreset = e.target.value as FlowPreset
        set({ flowPreset, windSpeed: FLOW_PRESET_SPEED_KMH[flowPreset], windTunnel: true })
      }}>{presets.map((p) => <option key={p}>{p}</option>)}</select></div>
      <div className="engineering-actions">
        <button className={s.exploded ? 'is-active' : ''} onClick={() => set({ exploded: !s.exploded })}>EXPLODED VIEW</button>
        <button className={s.floorView ? 'is-active' : ''} onClick={() => {
          const floorView = !s.floorView
          set({ floorView, cameraPreset: floorView ? 'floor' : 'hero', selectedComponent: null, turntable: !floorView })
        }}>ISOLATE FLOOR</button>
        <button className={s.activeAero ? 'is-active' : ''} onClick={() => set({ activeAero: !s.activeAero })}>ACTIVE AERO</button>
      </div>
      {s.activeAero && <div className="segmented"><button className={s.activeAeroState === 'Corner' ? 'is-active' : ''} onClick={() => set({ activeAeroState: 'Corner' })}>Corner</button><button className={s.activeAeroState === 'Straight' ? 'is-active' : ''} onClick={() => set({ activeAeroState: 'Straight' })}>Straight</button></div>}
      <div className="hud-mini"><span>FLOW MODEL</span><b>GEOMETRY-REACTIVE PROXY</b><span>VALIDATION</span><b>NOT CFD</b></div>
    </aside>
  )
}

function Toggle({ label, on, change }: { label: string; on: boolean; change: () => void }) {
  return <button className={on ? 'is-active' : ''} onClick={change}><span>{label}</span><i>{on ? 'ON' : 'OFF'}</i></button>
}
