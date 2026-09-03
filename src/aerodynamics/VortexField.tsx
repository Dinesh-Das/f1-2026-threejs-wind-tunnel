import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

export function VortexField() {
  const vortices = useMemo(() => [[1.8,.2,2.1],[-1.8,.2,2.1],[1.4,.05,-3],[-1.4,.05,-3]] as const, [])
  return <group>{vortices.map((origin,idx) => {
    const pts = Array.from({length:90},(_,i) => { const t=i*.18; const r=.18+.002*i; return new THREE.Vector3(origin[0]+Math.cos(t)*(idx<2?r:-r),origin[1]+Math.sin(t)*r,origin[2]-i*.06) })
    return <Line key={idx} points={pts} color="#b873ff" lineWidth={1.35} transparent opacity={.65} />
  })}</group>
}
