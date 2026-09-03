import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'

export function Lighting() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const aero = useF1Store((s) => s.aerodynamicMode)
  const team = teamById(teamId)
  return <>
    <ambientLight intensity={aero ? .18 : .32} />
    <directionalLight position={[4, 9, 5]} intensity={aero ? 1.4 : 3.2} castShadow shadow-mapSize={[2048,2048]} />
    <spotLight position={[-6, 5, 2]} intensity={3.8} angle={.5} penumbra={.8} color={team.primaryColor} />
    <spotLight position={[5, 3, -5]} intensity={3.3} angle={.55} penumbra={1} color={aero ? '#7ad9ff' : '#ffffff'} />
    <rectAreaLight position={[0, 7, 0]} rotation={[-Math.PI / 2,0,0]} width={10} height={4} intensity={6} color="#ffffff" />
  </>
}
