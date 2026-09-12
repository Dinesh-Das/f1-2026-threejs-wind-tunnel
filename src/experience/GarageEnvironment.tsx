import { Grid, ContactShadows, RoundedBox } from '@react-three/drei'
import { useF1Store } from '../store/useF1Store'

export function GarageEnvironment() {
  const aero = useF1Store((s) => s.aerodynamicMode)
  const entered = useF1Store((s) => s.entered)
  const floorView = useF1Store((s) => s.floorView)
  const quality = useF1Store((s) => s.quality)
  const cameraPreset = useF1Store((s) => s.cameraPreset)
  const topView = cameraPreset === 'top'
  if (aero || floorView) return null
  return (
    <group>
      <mesh position={[0, -0.52, 0]} receiveShadow>
        <cylinderGeometry args={[5.4, 5.6, 0.18, 128]} />
        <meshPhysicalMaterial
          color="#111416"
          metalness={0.58}
          roughness={0.24}
          clearcoat={0.42}
          clearcoatRoughness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.64, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[45, 45]} />
        <meshStandardMaterial color="#0a0d0f" metalness={0.04} roughness={0.88} />
      </mesh>
      <Grid
        position={[0, -0.635, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.16}
        cellColor="#252a2e"
        sectionSize={5}
        sectionThickness={0.42}
        sectionColor="#383f44"
        fadeDistance={25}
        fadeStrength={1.7}
      />
      <mesh position={[0, 3.15, -14.5]} receiveShadow>
        <boxGeometry args={[18, 6.4, 0.15]} />
        <meshStandardMaterial color="#111416" metalness={0.36} roughness={0.5} />
      </mesh>
      {[-4.4, -2.2, 0, 2.2, 4.4].map((x) => (
        <mesh key={`wall-${x}`} position={[x, 3.15, -14.4]}>
          <boxGeometry args={[0.035, 5.7, 0.08]} />
          <meshStandardMaterial color="#343a3e" metalness={0.82} roughness={0.2} />
        </mesh>
      ))}
      {!topView && (
        <>
          <mesh position={[0, 6.4, -3.5]} receiveShadow>
            <boxGeometry args={[20, 0.16, 19]} />
            <meshStandardMaterial color="#0c0f11" metalness={0.38} roughness={0.52} />
          </mesh>
          {[-5.2, 0, 5.2].map((x) => (
            <mesh key={`ceiling-${x}`} position={[x, 6.28, -1.5]}>
              <boxGeometry args={[2.5, 0.035, 10.4]} />
              <meshBasicMaterial color="#aeb8bc" toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
      {[-1, 1].map((side) => (
        <group key={`bay-${side}`} position={[side * 8.8, 2.4, -6.2]}>
          <RoundedBox args={[1.25, 4.5, 5.8]} radius={0.08} smoothness={4} castShadow receiveShadow>
            <meshStandardMaterial color="#14181b" metalness={0.6} roughness={0.28} />
          </RoundedBox>
          <mesh position={[-side * 0.64, 0.1, 1.35]}>
            <boxGeometry args={[0.035, 3.5, 0.08]} />
            <meshBasicMaterial color="#d9e1e5" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`cabinet-${side}`} position={[side * 6.7, 0.18, -11.6]}>
          <RoundedBox args={[1.5, 1.25, 0.7]} radius={0.06} smoothness={3} castShadow>
            <meshStandardMaterial color="#1c2024" metalness={0.68} roughness={0.26} />
          </RoundedBox>
          {[0.18, -0.18].map((y) => (
            <mesh key={y} position={[0, y, 0.37]}>
              <boxGeometry args={[1.15, 0.018, 0.025]} />
              <meshStandardMaterial color="#7b858c" metalness={0.92} roughness={0.14} />
            </mesh>
          ))}
        </group>
      ))}
      {entered && (quality === 'HIGH' || quality === 'ULTRA') && (
        <ContactShadows
          position={[0, -0.49, 0]}
          opacity={0.5}
          scale={10}
          blur={1.45}
          far={5.5}
          resolution={quality === 'ULTRA' ? 512 : 256}
        />
      )}
    </group>
  )
}
