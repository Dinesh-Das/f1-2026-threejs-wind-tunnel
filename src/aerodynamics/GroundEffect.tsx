import { Line } from '@react-three/drei'
import * as THREE from 'three'

export function GroundEffect() {
  const tracks = [-.72,-.36,0,.36,.72]
  return <group>{tracks.map((x) => <Line key={x} points={[new THREE.Vector3(x,-.46,4.8),new THREE.Vector3(x*.75,-.48,1.5),new THREE.Vector3(x*.55,-.5,-2.7),new THREE.Vector3(x*1.35,-.3,-4.3)]} color="#00d5ff" lineWidth={3} transparent opacity={.86} />)}</group>
}
