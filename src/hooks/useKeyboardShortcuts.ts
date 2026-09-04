import { useEffect } from 'react'
import { useF1Store, type CameraPreset } from '../store/useF1Store'

const cameras: Record<string, CameraPreset> = { '1':'hero','2':'front','3':'left','4':'rear','5':'top' }

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return

      const store = useF1Store.getState()
      const key = event.key.toLowerCase()
      if (cameras[key]) store.set({
        cameraPreset: cameras[key],
        selectedComponent: null,
        floorView: false,
        turntable: true,
      })
      if (key === 'a') store.set({ aerodynamicMode: !store.aerodynamicMode })
      if (key === 'w') store.set({ aerodynamicMode: true, windTunnel: !store.windTunnel })
      if (key === 'f') {
        const floorView = !store.floorView
        store.set({ floorView, cameraPreset: floorView ? 'floor' : 'hero', selectedComponent: null, turntable: !floorView })
      }
      if (key === 'x') store.set({ xray: !store.xray })
      if (key === 'e') store.set({ exploded: !store.exploded })
      if (key === 'c') store.set({ cinematic: !store.cinematic })
      if (key === 'r') store.set({ cameraPreset: 'hero', selectedComponent: null, floorView: false, turntable: true })
      if (key === ' ') { event.preventDefault(); store.set({ turntable: !store.turntable }) }
      if (key === 'escape') store.set({ selectedComponent: null, cameraPreset: 'hero', floorView: false, turntable: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
