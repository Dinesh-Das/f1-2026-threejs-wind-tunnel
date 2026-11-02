import { ContactShadows, MeshReflectorMaterial, RoundedBox } from '@react-three/drei'
import { useF1Store } from '../store/useF1Store'
import { useGeometryFieldSnapshot } from '../aerodynamics/core/geometryFieldRegistry'

export function GarageEnvironment() {
  const aero = useF1Store((s) => s.aerodynamicMode)
  const floorView = useF1Store((s) => s.floorView)
  const quality = useF1Store((s) => s.quality)
  const teamId = useF1Store((s) => s.selectedTeamId)
  const moving = useF1Store((s) => s.turntable || s.exploded)
  const snapshot = useGeometryFieldSnapshot(teamId)
  const topView = useF1Store((s) => s.cameraPreset === 'top')
  const reflective = quality === 'HIGH' || quality === 'ULTRA'
  if (aero || floorView) return null
  return (
    <group>
      <mesh position={[0, -0.505, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        {reflective ? (
          <MeshReflectorMaterial
            color="#171b1e"
            resolution={quality === 'ULTRA' ? 1024 : 512}
            blur={[400, 160]}
            mixBlur={1}
            mixStrength={0.28}
            mirror={0}
            metalness={0.12}
            roughness={0.68}
            depthScale={0.3}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.8}
          />
        ) : (
          <meshStandardMaterial color="#171b1e" metalness={0.08} roughness={0.72} />
        )}
      </mesh>
      {/* Expansion joints in an epoxy-coated concrete slab. */}
      {[-12, -6, 6, 12].map((offset) => (
        <group key={offset}>
          <mesh position={[offset, -0.503, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.009, 40]} />
            <meshStandardMaterial color="#25292b" roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.503, offset]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40, 0.009]} />
            <meshStandardMaterial color="#25292b" roughness={0.95} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 4.3, -12]} receiveShadow>
        <boxGeometry args={[100, 9.6, 0.25]} />
        <meshStandardMaterial color="#101417" roughness={0.82} metalness={0.12} />
      </mesh>
      <mesh position={[0, -0.12, -11.84]}>
        <boxGeometry args={[100, 0.07, 0.05]} />
        <meshStandardMaterial color="#85898b" metalness={0.8} roughness={0.35} />
      </mesh>
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
        <mesh key={x} position={[x, 4.3, -11.86]}>
          <boxGeometry args={[0.018, 9.4, 0.012]} />
          <meshStandardMaterial color="#121618" roughness={0.85} />
        </mesh>
      ))}
      {!topView &&
        [-6.5, 0, 6.5].map((x) => (
          <group key={x} position={[x, 7.4, -1]}>
            <mesh>
              <boxGeometry args={[1.7, 0.12, 12]} />
              <meshStandardMaterial color="#1b1f22" metalness={0.7} roughness={0.35} />
            </mesh>
            <mesh position={[0, -0.067, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.45, 11.6]} />
              <meshBasicMaterial color="#eeeae3" toneMapped={false} />
            </mesh>
          </group>
        ))}
      {/* Equipment stays at the back of the bay, outside the car silhouette. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 10, 0.42, -10.8]}>
          <RoundedBox args={[3.4, 1.85, 0.85]} radius={0.035} smoothness={2} castShadow receiveShadow>
            <meshStandardMaterial color="#262b2f" metalness={0.65} roughness={0.37} />
          </RoundedBox>
          <mesh position={[0, 0.96, 0]}>
            <boxGeometry args={[3.5, 0.06, 0.94]} />
            <meshStandardMaterial color="#92979a" metalness={0.85} roughness={0.35} />
          </mesh>
          {[0.53, 0.1, -0.33].map((y) => (
            <group key={y}>
              <mesh position={[0, y, 0.431]}>
                <boxGeometry args={[3.25, 0.012, 0.008]} />
                <meshStandardMaterial color="#101315" />
              </mesh>
              <mesh position={[0, y + 0.1, 0.46]}>
                <boxGeometry args={[1.1, 0.024, 0.038]} />
                <meshStandardMaterial color="#a0a5a9" metalness={1} roughness={0.28} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {reflective && (
        <ContactShadows
          key={quality}
          frames={moving || !snapshot ? Infinity : 32}
          position={[0, -0.499, 0]}
          opacity={0.62}
          scale={14}
          blur={2.2}
          far={2.2}
          resolution={256}
          color="#080a0b"
        />
      )}
    </group>
  )
}
