import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { FLOW_SCENARIOS } from './flowModel'

export function GroundEffect() {
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const dynamicPressureRatio = windRatio * windRatio
  const tracks = [-.72,-.36,0,.36,.72]
  return <group>{tracks.map((x) => {
    const yaw = scenario.yaw * 1.6
    return <Line key={x} points={[
      new THREE.Vector3(x,-.545,4.65),
      new THREE.Vector3(x*.88 + yaw*.15,-.552,2.2),
      new THREE.Vector3(x*.67 + yaw*.42,-.558,-.4),
      new THREE.Vector3(x*.61 + yaw*.65,-.552,-2.55),
      new THREE.Vector3(x*.92 + yaw*.84,-.49,-3.35),
      new THREE.Vector3(x*1.38 + yaw,-.30,-4.45),
      new THREE.Vector3(x*1.62 + yaw*1.1,-.20,-5.3),
    ]} color="#00d5ff" lineWidth={1.4 + scenario.floor*1.25} transparent opacity={(.13 + dynamicPressureRatio*.66)*scenario.floor} />
  })}</group>
}
