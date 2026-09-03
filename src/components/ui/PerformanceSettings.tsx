import { useState } from 'react'
import { useF1Store, type EnvironmentName, type Quality } from '../../store/useF1Store'

const envs: EnvironmentName[] = ['F1 Studio','Wind Tunnel','Night Garage','Daylight','Track Pit Lane','Black Void']
const qualities: Quality[] = ['LOW','MEDIUM','HIGH','ULTRA']

export function PerformanceSettings() {
  const [open, setOpen] = useState(false)
  const s = useF1Store()
  return <div className={`settings ${open ? 'is-open' : ''}`}><button className="settings-trigger" onClick={() => setOpen(!open)} aria-label="Settings">⚙</button>{open && <div className="settings-pop"><label>ENVIRONMENT<select value={s.environment} onChange={(e) => s.set({ environment: e.target.value as EnvironmentName })}>{envs.map((e) => <option key={e}>{e}</option>)}</select></label><label>QUALITY<select value={s.quality} onChange={(e) => s.set({ quality: e.target.value as Quality })}>{qualities.map((q) => <option key={q}>{q}</option>)}</select></label><label className="check"><input type="checkbox" checked={s.reducedMotion} onChange={(e) => s.set({ reducedMotion: e.target.checked })} /> Reduced motion</label><button onClick={() => s.set({ cinematic: !s.cinematic })}>{s.cinematic ? 'STOP CINEMATIC' : 'CINEMATIC'}</button><button onClick={() => s.set({ turntable: !s.turntable })}>{s.turntable ? 'PAUSE 360°' : 'START 360°'}</button></div>}</div>
}
