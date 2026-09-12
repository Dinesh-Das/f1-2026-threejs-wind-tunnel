import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useF1Store, type CameraPreset } from '../store/useF1Store'

const presets: Record<CameraPreset, [THREE.Vector3, THREE.Vector3]> = {
  hero: [new THREE.Vector3(9.6, 2.65, 12.8), new THREE.Vector3(0, 0.12, -0.1)],
  rearThreeQuarter: [new THREE.Vector3(8.2, 2.8, -14.2), new THREE.Vector3(0, 0.14, -0.45)],
  front: [new THREE.Vector3(0, 1.55, 13.2), new THREE.Vector3(0, 0.1, 0.25)],
  rear: [new THREE.Vector3(0, 1.7, -12.2), new THREE.Vector3(0, 0.18, -0.45)],
  left: [new THREE.Vector3(-10.4, 1.45, 0.2), new THREE.Vector3(0, 0.12, 0)],
  right: [new THREE.Vector3(10.4, 1.45, 0.2), new THREE.Vector3(0, 0.12, 0)],
  top: [new THREE.Vector3(0.12, 19, 0.12), new THREE.Vector3(0, 0, 0)],
  frontWing: [new THREE.Vector3(5.8, 1.45, 9.8), new THREE.Vector3(0, 0.05, 3.55)],
  sidepod: [new THREE.Vector3(5.4, 1.35, 2.1), new THREE.Vector3(0.9, 0.28, 0)],
  rearWing: [new THREE.Vector3(5.8, 2.35, -9.8), new THREE.Vector3(0, 0.68, -3.45)],
  floor: [new THREE.Vector3(7.8, -4.9, 8.2), new THREE.Vector3(0, -0.5, -0.45)],
  diffuser: [new THREE.Vector3(3.8, 0.25, -6.4), new THREE.Vector3(0, -0.25, -3.25)],
  cockpit: [new THREE.Vector3(3.4, 2.7, 2.2), new THREE.Vector3(0, 0.62, 0.45)],
  suspension: [new THREE.Vector3(5, 0.8, 4.2), new THREE.Vector3(1.25, 0.1, 2.5)],
  onboard: [new THREE.Vector3(0, 1.16, 0.5), new THREE.Vector3(0, 0.5, 5.5)],
  engineering: [new THREE.Vector3(11.4, 4.4, 14), new THREE.Vector3(0, 0.02, -0.25)],
}

const presetFov: Record<CameraPreset, number> = {
  hero: 34,
  rearThreeQuarter: 34,
  front: 31,
  rear: 31,
  left: 31,
  right: 31,
  top: 40,
  frontWing: 32,
  sidepod: 28,
  rearWing: 32,
  floor: 32,
  diffuser: 28,
  cockpit: 28,
  suspension: 28,
  onboard: 34,
  engineering: 32,
}

const aerodynamicHero: [THREE.Vector3, THREE.Vector3] = [
  // Observation-camera framing from outside the transparent test-section wall.
  // The longer working distance keeps the complete car and wake readable while
  // avoiding the contraction and downstream tunnel hardware.
  new THREE.Vector3(20, 4.3, -2.8),
  new THREE.Vector3(0, -0.02, 1.2),
]

const compareHero: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(11.2, 4.3, 13.2), new THREE.Vector3(0, 0.1, 0)]

const componentPreset: Record<string, CameraPreset> = {
  frontWing: 'frontWing',
  nose: 'frontWing',
  suspension: 'suspension',
  sidepods: 'sidepod',
  floor: 'floor',
  diffuser: 'diffuser',
  rearWing: 'rearWing',
  halo: 'cockpit',
  wheels: 'suspension',
}
const cinematicSteps: CameraPreset[] = [
  'frontWing',
  'suspension',
  'cockpit',
  'sidepod',
  'floor',
  'diffuser',
  'rearWing',
  'hero',
]

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
    const resolvedPreset = selected ? (componentPreset[selected] ?? preset) : preset
    if (!selected && resolvedPreset === 'hero' && aerodynamicMode) return aerodynamicHero
    if (!selected && resolvedPreset === 'hero' && compareMode) return compareHero
    return presets[resolvedPreset]
  }, [preset, selected, aerodynamicMode, compareMode])
  const elapsed = useRef(0)

  useEffect(() => {
    elapsed.current = 0
  }, [cinematic])
  useFrame((_, dt) => {
    if (!controls.current) return
    let pos = desired[0]
    let target = desired[1]
    let targetFov = !selected && preset === 'hero' && aerodynamicMode ? 35 : presetFov[preset]
    if (cinematic) {
      elapsed.current += dt
      const p = cinematicSteps[Math.floor((elapsed.current / 3) % cinematicSteps.length)]
      pos = presets[p][0]
      target = presets[p][1]
      targetFov = presetFov[p]
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
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      regress
      enableDamping
      dampingFactor={0.055}
      minDistance={2.2}
      maxDistance={22}
      maxPolarAngle={Math.PI * 0.82}
    />
  )
}
