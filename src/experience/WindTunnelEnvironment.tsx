import { Grid } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { useF1Store } from '../store/useF1Store'
import { WindTunnel } from '../aerodynamics/WindTunnel'

export function WindTunnelEnvironment() {
  const aero = useF1Store((s) => s.aerodynamicMode)
  const wind = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const floorView = useF1Store((s) => s.floorView)
  const fan = useRef<Group>(null)
  useFrame((_,dt) => { if (fan.current && wind && windSpeed > 0) fan.current.rotation.z += dt * 5.5 * (windSpeed / 350) })
  if (!aero || floorView) return null
  return <group>
    <mesh position={[0,-.58,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[32,18]} /><meshStandardMaterial color="#071014" metalness={.65} roughness={.34} /></mesh>
    <Grid position={[0,-.57,0]} args={[32,18]} cellSize={.5} cellThickness={.18} cellColor="#123546" sectionSize={2} sectionThickness={.55} sectionColor="#1e6e8f" fadeDistance={22} />
    <mesh position={[0,3,-6]}><boxGeometry args={[10,.08,2]} /><meshBasicMaterial color="#173745" /></mesh>
    <group ref={fan} position={[0,1.2,8.5]}>
      {[0,1,2,3,4,5].map((i) => <mesh key={i} rotation={[0,0,(Math.PI*2*i)/6]} position={[0,1.55,0]}><boxGeometry args={[.25,3.2,.12]} /><meshStandardMaterial color="#355867" metalness={.8} roughness={.3} /></mesh>)}
    </group>
    <mesh position={[0,1.2,8.55]}><torusGeometry args={[2.6,.18,16,64]} /><meshStandardMaterial color="#6b8995" metalness={.85} roughness={.2} /></mesh>
    <WindTunnel />
  </group>
}
