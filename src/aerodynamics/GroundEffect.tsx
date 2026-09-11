import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'
import { FLOW_SCENARIOS } from './flowModel'

export function GroundEffect() {
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const geometry = teamById(selectedTeamId).geometry
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const dynamicPressureRatio = windRatio * windRatio
  const tracks = [-.72,-.36,0,.36,.72]
  return <group>{tracks.map((x) => {
    const yaw = scenario.yaw * 1.6
    return <Line key={x} points={[
      new THREE.Vector3(x,-.545,4.65),
      new THREE.Vector3(x*.88 + yaw*.15,-.552,2.2),
      new THREE.Vector3(x*.67 + yaw*.42,-.558 - .012 * geometry.sidepodUndercut,-.4),
      new THREE.Vector3(x*.61 + yaw*.65,-.552,-2.55),
      new THREE.Vector3(x*.92 + yaw*.84,-.49,-3.35),
      new THREE.Vector3(x*1.38*geometry.diffuserExpansion + yaw,-.30,-4.45),
      new THREE.Vector3(x*1.62*geometry.diffuserExpansion + yaw*1.1,-.20,-5.3),
    ]} color="#79b9c4" lineWidth={1.0 + scenario.floor*.85*geometry.sidepodUndercut} transparent opacity={(.1 + dynamicPressureRatio*.44)*scenario.floor} />
  })}</group>
}
