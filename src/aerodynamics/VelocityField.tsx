import { Line } from '@react-three/drei'
import * as THREE from 'three'

export function VelocityField() {
  return <group>{[-.9,-.45,0,.45,.9].map((x) => <Line key={x} points={[new THREE.Vector3(x,-.42,4.5),new THREE.Vector3(x,-.42,-4.2)]} color="#58f0ff" lineWidth={2.2} transparent opacity={.78} />)}</group>
}
