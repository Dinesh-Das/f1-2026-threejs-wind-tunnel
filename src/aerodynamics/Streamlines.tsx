import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'

export function Streamlines() {
  const density = useF1Store((s) => s.streamlineDensity)
  const n = density === 'Ultra' ? 54 : density === 'High' ? 38 : density === 'Medium' ? 24 : 12
  const lines = useMemo(() => Array.from({length:n},(_,i) => {
    const x = ((i % 9)-4)*.48
    const y = -.25 + Math.floor(i/9)*.46
    return Array.from({length:48},(_,j) => {
      const z = 8 - j*.34
      const sideDeflect = Math.exp(-Math.pow(z-2.2,2)/2.1) * Math.sign(x||1) * .38
      const floorPull = Math.abs(x)<1.3 ? -Math.exp(-Math.pow(z,2)/7)*.28 : 0
      return new THREE.Vector3(x+sideDeflect,y+floorPull,z)
    })
  }),[n])
  return <group>{lines.map((pts,i) => <Line key={i} points={pts} color={i%3===0?'#b9f2ff':'#4ac9ff'} lineWidth={i%3===0?1.2:.65} transparent opacity={.45} />)}</group>
}
