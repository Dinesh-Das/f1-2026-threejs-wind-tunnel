import { Environment } from '@react-three/drei'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'

export function Lighting() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const aero = useF1Store((s) => s.aerodynamicMode)
  const floorView = useF1Store((s) => s.floorView)
  const team = teamById(teamId)
  return <>
    <ambientLight intensity={floorView ? .12 : aero ? .07 : .1} />
    <directionalLight
      position={[4, 9, 5]}
      intensity={floorView ? .55 : aero ? 1.25 : 2.15}
      castShadow
      shadow-mapSize={[4096,4096]}
      shadow-bias={-.00008}
      shadow-normalBias={.025}
      shadow-camera-near={1}
      shadow-camera-far={28}
      shadow-camera-left={-7}
      shadow-camera-right={7}
      shadow-camera-top={5}
      shadow-camera-bottom={-3}
    />
    <spotLight position={[-6, 5, 3]} intensity={aero ? .35 : 1.2} angle={.42} penumbra={.95} color={team.primaryColor} castShadow />
    <spotLight position={[5, 3, -5]} intensity={aero ? 1.4 : 2.2} angle={.55} penumbra={1} color={aero ? '#b8ecff' : '#ffffff'} />
    <rectAreaLight position={[0, 7, 0]} rotation={[-Math.PI / 2,0,0]} width={10} height={3} intensity={aero ? 2.8 : 5.2} color="#ffffff" />
    <rectAreaLight position={[-5, 2.8, 1]} rotation={[0, Math.PI / 2, 0]} width={7} height={1.2} intensity={aero ? 1.2 : 3.2} color="#dbe8ff" />
    <rectAreaLight position={[5, 2.2, -1]} rotation={[0, -Math.PI / 2, 0]} width={6} height={1.0} intensity={aero ? .8 : 2.4} color="#ffffff" />
    {!floorView && <Environment
      files="/assets/hdr/studio_small_03_1k.hdr"
      background={false}
      environmentIntensity={aero ? .72 : 1.05}
    />}
    {floorView && <>
      <directionalLight position={[5, -6, 6]} intensity={2.25} color="#dcefff" />
      <directionalLight position={[-4, -3, -5]} intensity={1.15} color="#ffffff" />
    </>}
  </>
}
