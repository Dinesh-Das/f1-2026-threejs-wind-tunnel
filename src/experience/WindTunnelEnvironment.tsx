import { Grid } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { WindTunnel } from '../aerodynamics/WindTunnel'
import { F1_2026_REFERENCE } from '../data/f1Reference'

const ROAD_MARKER_SPACING = 4

function TunnelStructure() {
  const honeycomb = Array.from({ length: 15 }, (_, xIndex) =>
    Array.from({ length: 7 }, (_, yIndex) => ({
      x: -3.5 + xIndex * .5,
      y: -.15 + yIndex * .5,
    })),
  ).flat()

  return <group>
    {/* Transparent test-section walls retain visibility while giving the flow a real tunnel volume. */}
    {[1, -1].map((side) => <mesh key={`wall-${side}`} position={[side * 4.55, 1.55, -.3]}>
      <boxGeometry args={[.055, 4.25, 14.8]} />
      <meshPhysicalMaterial color="#6f9dad" transparent opacity={.11} roughness={.12} metalness={.05} transmission={.16} depthWrite={false} />
    </mesh>)}
    <mesh position={[0, 3.65, -.3]}>
      <boxGeometry args={[9.15, .055, 14.8]} />
      <meshPhysicalMaterial color="#7098a6" transparent opacity={.1} roughness={.16} transmission={.12} depthWrite={false} />
    </mesh>

    {/* Settling chamber and honeycomb upstream of the test section. */}
    <mesh position={[0, 1.45, 7.45]}>
      <boxGeometry args={[8.35, 3.85, .09]} />
      <meshStandardMaterial color="#263c45" metalness={.72} roughness={.28} />
    </mesh>
    {honeycomb.map(({ x, y }) => <mesh key={`${x}-${y}`} position={[x, y, 7.38]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[.18, .18, .18, 6, 1, true]} />
      <meshStandardMaterial color="#526a73" metalness={.66} roughness={.32} />
    </mesh>)}
    {[-.5, .5].map((offset) => <mesh key={offset} position={[0, 1.45, 6.82 + offset * .34]}>
      <boxGeometry args={[8.2, 3.72, .025]} />
      <meshBasicMaterial color="#8bb0bd" wireframe transparent opacity={.18} />
    </mesh>)}

    {/* Contraction and downstream diffuser are represented by tapered structural ribs. */}
    {[1, -1].map((side) => <group key={`contraction-${side}`}>
      <mesh position={[side * 4.78, 1.55, 5.65]} rotation={[0, side * -.07, 0]}>
        <boxGeometry args={[.12, 4.2, 3.6]} />
        <meshStandardMaterial color="#1a2d35" metalness={.68} roughness={.3} />
      </mesh>
      <mesh position={[side * 4.9, 1.58, -8.05]} rotation={[0, side * .08, 0]}>
        <boxGeometry args={[.12, 4.45, 3.8]} />
        <meshStandardMaterial color="#1a2d35" metalness={.68} roughness={.3} />
      </mesh>
    </group>)}

    {/* Boundary-layer suction slots around the rolling-road edges. */}
    {[1, -1].map((side) => <group key={`suction-${side}`}>
      {Array.from({ length: 17 }, (_, index) => <mesh key={index} position={[side * 2.55, -.548, -6.4 + index * .8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[.08, .48]} />
        <meshBasicMaterial color="#2aa3c4" transparent opacity={.34} />
      </mesh>)}
    </group>)}

    <mesh position={[0, 1.55, -9.8]}>
      <torusGeometry args={[3.15, .2, 18, 72]} />
      <meshStandardMaterial color="#637983" metalness={.82} roughness={.24} />
    </mesh>
  </group>
}

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
    <TunnelStructure />
    <RollingRoad />
    <mesh position={[0,3,-6]}><boxGeometry args={[10,.08,2]} /><meshBasicMaterial color="#173745" /></mesh>
    <group ref={fan} position={[0,1.2,8.5]}>
      {[0,1,2,3,4,5].map((i) => <mesh key={i} rotation={[0,0,(Math.PI*2*i)/6]} position={[0,1.55,0]}><boxGeometry args={[.25,3.2,.12]} /><meshStandardMaterial color="#355867" metalness={.8} roughness={.3} /></mesh>)}
    </group>
    <mesh position={[0,1.2,8.55]}><torusGeometry args={[2.6,.18,16,64]} /><meshStandardMaterial color="#6b8995" metalness={.85} roughness={.2} /></mesh>
    <group position={[0, 1.2, -9.75]} rotation={[0, 0, Math.PI / 6]}>
      {[0,1,2,3,4,5,6,7].map((i) => <mesh key={i} rotation={[0,0,(Math.PI*2*i)/8]} position={[0,1.82,0]}><boxGeometry args={[.2,3.65,.1]} /><meshStandardMaterial color="#314c57" metalness={.82} roughness={.28} /></mesh>)}
    </group>
    <WindTunnel />
  </group>
}
