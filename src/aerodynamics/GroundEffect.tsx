import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { FLOW_SCENARIOS } from './flowModel'

export function GroundEffect() {
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const tracks = [-.72,-.36,0,.36,.72]
  return <group>{tracks.map((x) => {
    const yaw = scenario.yaw * 1.6
    return <Line key={x} points={[
      new THREE.Vector3(x,-.45,4.65),
      new THREE.Vector3(x*.8 + yaw*.2,-.48,1.5),
      new THREE.Vector3(x*.62 + yaw*.6,-.5,-2.65),
      new THREE.Vector3(x*1.22 + yaw,-.32,-4.25),
    ]} color="#00d5ff" lineWidth={1.8 + scenario.floor*1.1} transparent opacity={(.2 + windRatio*.58)*scenario.floor} />
  })}</group>
}
