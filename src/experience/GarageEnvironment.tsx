import { Grid, ContactShadows } from '@react-three/drei'
import { useF1Store } from '../store/useF1Store'

export function GarageEnvironment() {
  const aero = useF1Store((s) => s.aerodynamicMode)
  const entered = useF1Store((s) => s.entered)
  const floorView = useF1Store((s) => s.floorView)
  if (aero || floorView) return null
  return <group>
    <mesh position={[0,-.52,0]} receiveShadow><cylinderGeometry args={[5.4,5.6,.2,96]} /><meshStandardMaterial color="#101214" metalness={.86} roughness={.18} /></mesh>
    <mesh position={[0,-.64,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[45,45]} /><meshStandardMaterial color="#070809" metalness={.76} roughness={.2} /></mesh>
    <Grid position={[0,-.635,0]} args={[40,40]} cellSize={1} cellThickness={.2} cellColor="#353a40" sectionSize={5} sectionThickness={.6} sectionColor="#525963" fadeDistance={28} fadeStrength={1.5} />
    <mesh position={[0,5,-9]}><boxGeometry args={[12,.12,3]} /><meshBasicMaterial color="#eeeeee" toneMapped={false} /></mesh>
    <mesh position={[-7,2.5,-6]}><boxGeometry args={[.08,5,8]} /><meshStandardMaterial color="#121518" metalness={.7} roughness={.25} /></mesh>
    <mesh position={[7,2.5,-6]}><boxGeometry args={[.08,5,8]} /><meshStandardMaterial color="#121518" metalness={.7} roughness={.25} /></mesh>
    {entered && <ContactShadows position={[0,-.5,0]} opacity={.62} scale={13} blur={2.4} far={6} />}
  </group>
}
