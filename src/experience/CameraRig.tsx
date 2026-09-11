import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useF1Store, type CameraPreset } from '../store/useF1Store'

const presets: Record<CameraPreset, [THREE.Vector3, THREE.Vector3]> = {
  hero: [new THREE.Vector3(10,2.65,12),new THREE.Vector3(0,.12,-.2)],
  front: [new THREE.Vector3(0,1.05,9.8),new THREE.Vector3(0,.1,0)],
  rear: [new THREE.Vector3(0,1.1,-9.8),new THREE.Vector3(0,.2,0)],
  left: [new THREE.Vector3(-10,1.25,.2),new THREE.Vector3(0,.15,0)],
  right: [new THREE.Vector3(10,1.25,.2),new THREE.Vector3(0,.15,0)],
  top: [new THREE.Vector3(.01,10,.01),new THREE.Vector3(0,0,0)],
  frontWing: [new THREE.Vector3(1.6,.45,5.2),new THREE.Vector3(0,-.05,3.5)],
  rearWing: [new THREE.Vector3(1.8,1.25,-5.0),new THREE.Vector3(0,.6,-3.2)],
  floor: [new THREE.Vector3(7.8,-4.9,8.2),new THREE.Vector3(0,-.5,-.45)],
  diffuser: [new THREE.Vector3(3,.08,-5.2),new THREE.Vector3(0,-.28,-3.1)],
  cockpit: [new THREE.Vector3(2.6,2.2,1.2),new THREE.Vector3(0,.62,.45)],
  suspension: [new THREE.Vector3(4,.4,3.5),new THREE.Vector3(1.25,.1,2.5)],
  onboard: [new THREE.Vector3(0,1.16,.5),new THREE.Vector3(0,.5,5.5)],
  engineering: [new THREE.Vector3(10.4,4.25,11.7),new THREE.Vector3(0,.02,-.25)],
}

const aerodynamicHero: [THREE.Vector3, THREE.Vector3] = [
  // Observation-camera framing from outside the transparent test-section wall.
  // The longer working distance keeps the complete car and wake readable while
  // avoiding the contraction and downstream tunnel hardware.
  new THREE.Vector3(20, 4.3, -2.8),
  new THREE.Vector3(0, -.02, 1.2),
]

const compareHero: [THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(11.2, 4.3, 13.2),
  new THREE.Vector3(0, .1, 0),
]

const componentPreset: Record<string, CameraPreset> = { frontWing:'frontWing', nose:'frontWing', suspension:'suspension', sidepods:'left', floor:'floor', diffuser:'diffuser', rearWing:'rearWing', halo:'cockpit', wheels:'suspension' }
const cinematicSteps: CameraPreset[] = ['frontWing','suspension','cockpit','left','floor','diffuser','rearWing','hero']

export function CameraRig() {
  const { camera } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)
  const preset = useF1Store((s) => s.cameraPreset)
  const selected = useF1Store((s) => s.selectedComponent)
  const cinematic = useF1Store((s) => s.cinematic)
  const reduced = useF1Store((s) => s.reducedMotion)
  const aerodynamicMode = useF1Store((s) => s.aerodynamicMode)
  const compareMode = useF1Store((s) => s.compareMode)
  const set = useF1Store((s) => s.set)
  const desired = useMemo(() => {
    const resolvedPreset = selected ? componentPreset[selected] ?? preset : preset
    if (!selected && resolvedPreset === 'hero' && aerodynamicMode) return aerodynamicHero
    if (!selected && resolvedPreset === 'hero' && compareMode) return compareHero
    return presets[resolvedPreset]
  }, [preset, selected, aerodynamicMode, compareMode])
  const elapsed = useRef(0)

  useEffect(() => { elapsed.current = 0 }, [cinematic])
  useFrame((_, dt) => {
    if (!controls.current) return
    let pos = desired[0]
    let target = desired[1]
    let targetFov = !selected && preset === 'hero' && aerodynamicMode ? 35 : 34
    if (cinematic) {
      elapsed.current += dt
      const p = cinematicSteps[Math.floor((elapsed.current / 3) % cinematicSteps.length)]
      pos = presets[p][0]; target = presets[p][1]
      targetFov = 34
      if (elapsed.current > 24) set({ cinematic: false, cameraPreset: 'hero' })
    }
    const t = reduced ? 1 : 1 - Math.exp(-dt * 3.2)
    camera.position.lerp(pos, t)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, t)
      camera.updateProjectionMatrix()
    }
    controls.current.target.lerp(target, t)
    controls.current.update()
  })
  return <OrbitControls ref={controls} makeDefault regress enableDamping dampingFactor={.055} minDistance={2.2} maxDistance={22} maxPolarAngle={Math.PI * .82} />
}
