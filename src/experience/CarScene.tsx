import { Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { CarModel } from '../cars/CarModel'
import { carManifestForTeam } from '../cars/carAssetManifest'
import { teamById } from '../data/teams'
import { useF1Store } from '../store/useF1Store'

function CarForTeam({
  teamId,
  position,
  scale,
  interactive,
}: {
  teamId: string
  position: [number, number, number]
  scale: number
  interactive: boolean
}) {
  const team = teamById(teamId)
  const manifest = carManifestForTeam(teamId)
  return <CarModel team={team} manifest={manifest} position={position} scale={scale} interactive={interactive} />
}

export function CarScene() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const compareTeamId = useF1Store((s) => s.compareTeamId)
  const compareMode = useF1Store((s) => s.compareMode)
  const turntable = useF1Store((s) => s.turntable)
  const turntableSpeed = useF1Store((s) => s.turntableSpeed)
  const direction = useF1Store((s) => s.turntableDirection)
  const reduced = useF1Store((s) => s.reducedMotion)
  const floorView = useF1Store((s) => s.floorView)
  const aerodynamicMode = useF1Store((s) => s.aerodynamicMode)
  const cameraPreset = useF1Store((s) => s.cameraPreset)
  const group = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!group.current) return
    group.current.rotation.y = 0
  }, [cameraPreset])
  useFrame((_, dt) => {
    if (!group.current) return
    if (aerodynamicMode) {
      // A wind-tunnel run requires the car centerline to stay aligned with the
      // tunnel. Scenario yaw is applied to the flow field, not by rotating the car.
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, 0, 9, dt)
      return
    }
    if (turntable && !compareMode && !reduced && !floorView) group.current.rotation.y += dt * turntableSpeed * direction
  })
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <CarForTeam
          teamId={teamId}
          position={compareMode ? [-2.6, 0, 0] : [0, 0, 0]}
          scale={compareMode ? 0.82 : 1}
          interactive={!compareMode}
        />
        {compareMode && <CarForTeam teamId={compareTeamId} position={[2.6, 0, 0]} scale={0.82} interactive={false} />}
      </Suspense>
    </group>
  )
}
