import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { FLOW_SCENARIOS } from './flowModel'

export function VortexField() {
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const vortices = useMemo(() => [[1.8,.2,2.1],[-1.8,.2,2.1],[1.4,.05,-3],[-1.4,.05,-3]] as const, [])
  return <group>{vortices.map((origin,idx) => {
    const strength = scenario.vortex * (.72 + windRatio*.28)
    const pts = Array.from({length:90},(_,i) => {
      const t=i*.18
      const r=(.13+.0024*i)*strength
      const yawDrift = scenario.yaw * i * .014
      return new THREE.Vector3(origin[0]+Math.cos(t)*(idx<2?r:-r)+yawDrift,origin[1]+Math.sin(t)*r,origin[2]-i*.06)
    })
    return <Line key={idx} points={pts} color="#b873ff" lineWidth={1.1 + strength*.35} transparent opacity={.16 + windRatio*.5*scenario.vortex} />
  })}</group>
}
