import { Grid, ContactShadows, RoundedBox } from '@react-three/drei'
import { useF1Store } from '../store/useF1Store'

export function GarageEnvironment() {
  const aero = useF1Store((s) => s.aerodynamicMode)
  const entered = useF1Store((s) => s.entered)
  const floorView = useF1Store((s) => s.floorView)
  const quality = useF1Store((s) => s.quality)
  if (aero || floorView) return null
  return <group>
    <mesh position={[0,-.52,0]} receiveShadow><cylinderGeometry args={[5.4,5.6,.18,128]} /><meshPhysicalMaterial color="#111416" metalness={.58} roughness={.24} clearcoat={.42} clearcoatRoughness={.2} /></mesh>
    <mesh position={[0,-.64,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[45,45]} />
      <meshStandardMaterial color="#0a0d0f" metalness={.04} roughness={.88} />
    </mesh>
    <Grid position={[0,-.635,0]} args={[40,40]} cellSize={1} cellThickness={.16} cellColor="#252a2e" sectionSize={5} sectionThickness={.42} sectionColor="#383f44" fadeDistance={25} fadeStrength={1.7} />
    <mesh position={[0,3.15,-9]} receiveShadow><boxGeometry args={[14,6.4,.15]} /><meshStandardMaterial color="#111416" metalness={.36} roughness={.5} /></mesh>
    {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => <mesh key={`wall-${x}`} position={[x,3.15,-8.9]}><boxGeometry args={[.035,5.7,.08]} /><meshStandardMaterial color="#343a3e" metalness={.82} roughness={.2} /></mesh>)}
    <mesh position={[0,5.95,-3]} receiveShadow><boxGeometry args={[16,.16,13]} /><meshStandardMaterial color="#0c0f11" metalness={.38} roughness={.52} /></mesh>
    {[-4.2, 0, 4.2].map((x) => <mesh key={`ceiling-${x}`} position={[x,5.82,-1]}><boxGeometry args={[2.35,.035,8.2]} /><meshBasicMaterial color="#aeb8bc" toneMapped={false} /></mesh>)}
    {[-1, 1].map((side) => <group key={`bay-${side}`} position={[side * 6.6, 2.4, -3.8]}>
      <RoundedBox args={[1.25,4.5,8.6]} radius={.08} smoothness={4} castShadow receiveShadow><meshStandardMaterial color="#14181b" metalness={.6} roughness={.28} /></RoundedBox>
      <mesh position={[-side * .64,.1,2.2]}><boxGeometry args={[.035,3.5,.08]} /><meshBasicMaterial color="#d9e1e5" toneMapped={false} /></mesh>
    </group>)}
    {[-1, 1].map((side) => <group key={`cabinet-${side}`} position={[side * 5.15,.18,-6.9]}>
      <RoundedBox args={[1.5,1.25,.7]} radius={.06} smoothness={3} castShadow><meshStandardMaterial color="#1c2024" metalness={.68} roughness={.26} /></RoundedBox>
      {[.18, -.18].map((y) => <mesh key={y} position={[0,y,.37]}><boxGeometry args={[1.15,.018,.025]} /><meshStandardMaterial color="#7b858c" metalness={.92} roughness={.14} /></mesh>)}
    </group>)}
    {entered && (quality === 'HIGH' || quality === 'ULTRA') && <ContactShadows position={[0,-.49,0]} opacity={.5} scale={10} blur={1.45} far={5.5} resolution={quality === 'ULTRA' ? 512 : 256} />}
  </group>
}
