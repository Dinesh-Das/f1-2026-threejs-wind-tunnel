import { Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { useRef } from 'react'
import { TeamCar } from '../cars/TeamCar'
import { teamById } from '../data/teams'
import { useF1Store } from '../store/useF1Store'

export function CarScene() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const compareTeamId = useF1Store((s) => s.compareTeamId)
  const compareMode = useF1Store((s) => s.compareMode)
  const turntable = useF1Store((s) => s.turntable)
  const turntableSpeed = useF1Store((s) => s.turntableSpeed)
  const direction = useF1Store((s) => s.turntableDirection)
  const reduced = useF1Store((s) => s.reducedMotion)
  const floorView = useF1Store((s) => s.floorView)
  const group = useRef<Group>(null)
  useFrame((_, dt) => { if (group.current && turntable && !compareMode && !reduced && !floorView) group.current.rotation.y += dt * turntableSpeed * direction })
  return <group ref={group}>
    <Suspense fallback={null}>
      <TeamCar team={teamById(teamId)} position={compareMode ? [-2.6,0,0] : [0,0,0]} scale={compareMode ? .82 : 1} interactive={!compareMode} />
      {compareMode && <TeamCar team={teamById(compareTeamId)} position={[2.6,0,0]} scale={.82} interactive={false} />}
    </Suspense>
  </group>
}
