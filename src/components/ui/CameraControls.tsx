import { useF1Store, type CameraPreset } from '../../store/useF1Store'

const views: Array<[string, CameraPreset]> = [['Hero','hero'],['Front','front'],['Side','left'],['Rear','rear'],['Top','top'],['Wing','frontWing'],['Floor','floor'],['Cockpit','cockpit']]

export function CameraControls() {
  const active = useF1Store((s) => s.cameraPreset)
  const set = useF1Store((s) => s.set)
  return (
    <div className="camera-strip" aria-label="Camera views">
      <span>CAMERA</span>
      {views.map(([label, id]) => <button key={id} className={active === id ? 'is-active' : ''} onClick={() => set({
        cameraPreset: id,
        selectedComponent: null,
        floorView: id === 'floor',
        turntable: id !== 'floor',
      })}>{label}</button>)}
    </div>
  )
}
