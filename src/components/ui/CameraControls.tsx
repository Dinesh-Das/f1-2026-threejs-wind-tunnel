import { useF1Store, type CameraPreset } from '../../store/useF1Store'

const views: Array<[string, CameraPreset]> = [
  ['Front ¾', 'hero'],
  ['Rear ¾', 'rearThreeQuarter'],
  ['Front', 'front'],
  ['Side', 'left'],
  ['Rear', 'rear'],
  ['Top', 'top'],
  ['Front Wing', 'frontWing'],
  ['Sidepod', 'sidepod'],
  ['Rear Wing', 'rearWing'],
  ['Floor', 'floor'],
  ['Diffuser', 'diffuser'],
  ['Cockpit', 'cockpit'],
  ['Suspension', 'suspension'],
  ['Onboard', 'onboard'],
]

export function CameraControls() {
  const active = useF1Store((s) => s.cameraPreset)
  const set = useF1Store((s) => s.set)
  return (
    <div className="camera-strip" aria-label="Camera views">
      <span>CAMERA</span>
      {views.map(([label, id]) => (
        <button
          key={id}
          className={active === id ? 'is-active' : ''}
          onClick={() =>
            set({
              cameraPreset: id,
              selectedComponent: null,
              floorView: id === 'floor',
              turntable: false,
            })
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
