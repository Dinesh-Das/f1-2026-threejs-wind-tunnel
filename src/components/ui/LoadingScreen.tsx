import { useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useF1Store } from '../../store/useF1Store'

export function Intro() {
  const [opening, setOpening] = useState(false)
  const set = useF1Store((s) => s.set)
  const { active, progress, errors } = useProgress()
  const ready = !active && progress >= 99.9 && errors.length === 0

  const enter = () => {
    if (!ready) return
    setOpening(true)
    window.setTimeout(() => set({ entered: true }), 650)
  }

  return (
    <section className={`intro ${opening ? 'intro--opening' : ''}`} aria-label="F1 engineering experience introduction">
      <div className="intro-grid" />
      <div className="intro-copy">
        <span className="eyebrow">FORMULA 1</span>
        <h1>2026</h1>
        <p>ENGINEERING EXPERIENCE</p>
        <div className="load-line"><span style={{ width: `${Math.max(progress, 12)}%` }} /></div>
        <div className={`loading-copy ${errors.length ? 'loading-copy--error' : ''}`}>
          {errors.length ? 'Asset loading failed · check console' : ready ? 'Vehicle · materials · environment ready' : 'Preparing vehicle · materials · environment'}
        </div>
        <button className="enter-button" onClick={enter} disabled={!ready} aria-disabled={!ready}>
          {ready ? 'ENTER GARAGE' : `LOADING ${Math.round(progress)}%`} <span>→</span>
        </button>
      </div>
      <div className="intro-meta">INTERACTIVE 3D / AERODYNAMIC VISUALIZATION</div>
    </section>
  )
}
