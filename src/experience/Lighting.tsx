import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'

export function Lighting() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const aero = useF1Store((s) => s.aerodynamicMode)
  const floorView = useF1Store((s) => s.floorView)
  const team = teamById(teamId)
  return <>
    <ambientLight intensity={floorView ? .22 : aero ? .14 : .24} />
    <directionalLight position={[4, 9, 5]} intensity={floorView ? .35 : aero ? 1.15 : 2.1} castShadow shadow-mapSize={[2048,2048]} />
    <spotLight position={[-6, 5, 2]} intensity={aero ? .45 : .72} angle={.5} penumbra={.9} color={team.primaryColor} />
    <spotLight position={[5, 3, -5]} intensity={aero ? 1.25 : 1.55} angle={.55} penumbra={1} color={aero ? '#b8ecff' : '#ffffff'} />
    <rectAreaLight position={[0, 7, 0]} rotation={[-Math.PI / 2,0,0]} width={10} height={4} intensity={3.6} color="#ffffff" />
    {floorView && <>
      <directionalLight position={[5, -6, 6]} intensity={2.25} color="#dcefff" />
      <directionalLight position={[-4, -3, -5]} intensity={1.15} color="#ffffff" />
    </>}
  </>
}
