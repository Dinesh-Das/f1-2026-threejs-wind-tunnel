import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { FLOW_SCENARIOS } from './flowModel'

export function VelocityField() {
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  return <group>{[-.9,-.45,0,.45,.9].map((x, i) => {
    const wakeOffset = Math.sin(i*1.7) * scenario.turbulence * .28
    return <Line key={x} points={[
      new THREE.Vector3(x,-.4,4.5),
      new THREE.Vector3(x + scenario.yaw*.9,-.44,.2),
      new THREE.Vector3(x + scenario.yaw*1.8 + wakeOffset,-.4,-4.2),
    ]} color="#58f0ff" lineWidth={1.2 + windRatio*1.4} transparent opacity={.16 + windRatio*.52} />
  })}</group>
}
