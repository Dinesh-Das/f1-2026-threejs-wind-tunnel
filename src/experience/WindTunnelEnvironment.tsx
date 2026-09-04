import { Grid } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { WindTunnel } from '../aerodynamics/WindTunnel'
import { F1_2026_REFERENCE } from '../data/f1Reference'

const ROAD_MARKER_SPACING = 4

function RollingRoad() {
  const wind = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const markers = useRef<THREE.Group>(null)
  const roadDistance = useRef(0)

  useFrame((_, dt) => {
    if (!markers.current || !wind || windSpeed <= 0) return
    const speedSceneUnits = (windSpeed / 3.6) * F1_2026_REFERENCE.sceneUnitsPerMetre
    roadDistance.current = (roadDistance.current + dt * speedSceneUnits) % ROAD_MARKER_SPACING
    // Stationary tunnel car: the rolling road moves toward -Z, matching the
    // relative ground motion of a car travelling forward in +Z on track.
    markers.current.position.z = -roadDistance.current
  })

  return <group>
    <mesh position={[0, -.565, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[4.9, 26]} />
      <meshStandardMaterial color="#05090b" metalness={.28} roughness={.72} />
    </mesh>
    <group ref={markers}>
      {Array.from({ length: 9 }, (_, index) => {
        const z = -16 + index * ROAD_MARKER_SPACING
        return <group key={index} position={[0, -.558, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.45, .055]} />
            <meshBasicMaterial color="#28748d" transparent opacity={.58} />
          </mesh>
          <mesh position={[0, .002, .55]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[.08, .72]} />
            <meshBasicMaterial color="#4ba6bd" transparent opacity={.28} />
          </mesh>
        </group>
      })}
    </group>
  </group>
}

export function WindTunnelEnvironment() {
  const aero = useF1Store((s) => s.aerodynamicMode)
  const wind = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const floorView = useF1Store((s) => s.floorView)
  const fan = useRef<THREE.Group>(null)
  useFrame((_,dt) => { if (fan.current && wind && windSpeed > 0) fan.current.rotation.z += dt * 5.5 * (windSpeed / 350) })
  if (!aero || floorView) return null
  return <group>
    <mesh position={[0,-.58,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[32,18]} /><meshStandardMaterial color="#071014" metalness={.65} roughness={.34} /></mesh>
    <Grid position={[0,-.57,0]} args={[32,18]} cellSize={.5} cellThickness={.18} cellColor="#123546" sectionSize={2} sectionThickness={.55} sectionColor="#1e6e8f" fadeDistance={22} />
    <RollingRoad />
    <mesh position={[0,3,-6]}><boxGeometry args={[10,.08,2]} /><meshBasicMaterial color="#173745" /></mesh>
    <group ref={fan} position={[0,1.2,8.5]}>
      {[0,1,2,3,4,5].map((i) => <mesh key={i} rotation={[0,0,(Math.PI*2*i)/6]} position={[0,1.55,0]}><boxGeometry args={[.25,3.2,.12]} /><meshStandardMaterial color="#355867" metalness={.8} roughness={.3} /></mesh>)}
    </group>
    <mesh position={[0,1.2,8.55]}><torusGeometry args={[2.6,.18,16,64]} /><meshStandardMaterial color="#6b8995" metalness={.85} roughness={.2} /></mesh>
    <WindTunnel />
  </group>
}
