import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { FLOW_SCENARIOS } from './flowModel'

export function Streamlines() {
  const density = useF1Store((s) => s.streamlineDensity)
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const n = density === 'Ultra' ? 54 : density === 'High' ? 38 : density === 'Medium' ? 24 : 12
  const lines = useMemo(() => Array.from({length:n},(_,i) => {
    const x = ((i % 9)-4)*.48
    const y = -.25 + Math.floor(i/9)*.46
    return Array.from({length:48},(_,j) => {
      const z = 8 - j*.34
      const progress = j / 47
      const sideDeflect = Math.exp(-Math.pow(z-2.2,2)/2.1) * Math.sign(x||1) * .38 * scenario.lateralDeflection
      const underfloor = Math.abs(x) < 1.3 && y < .28
      const floorPull = underfloor ? -Math.exp(-Math.pow(z+.1,2)/8.5)*.23*scenario.floor : 0
      const diffuser = underfloor && z < -2.45 ? THREE.MathUtils.clamp((-z - 2.45) / 2.2, 0, 1) * scenario.floor : 0
      const diffuserLift = diffuser * .23
      const diffuserSpread = diffuser * Math.sign(x || 1) * .28
      const wake = z < -2.45 ? THREE.MathUtils.clamp((-z - 2.45) / 4.2, 0, 1) : 0
      const disturbed = Math.sin(j*.7 + i*1.9) * .18 * scenario.turbulence * wake
      const yaw = scenario.yaw * progress * 2.8
      const wakeLag = wake * scenario.wakeDeficit * Math.exp(-Math.pow(x / 1.45, 2)) * .38
      return new THREE.Vector3(x+sideDeflect+diffuserSpread+yaw+disturbed,y+floorPull+diffuserLift+disturbed*.25,z+wakeLag)
    })
  }),[n, scenario])
  return <group>{lines.map((pts,i) => <Line key={i} points={pts} color={i%3===0?'#b9f2ff':'#4ac9ff'} lineWidth={i%3===0?1.2:.65} transparent opacity={.16 + windRatio*.34} />)}</group>
}
