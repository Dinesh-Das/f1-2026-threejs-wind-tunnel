import { Environment } from '@react-three/drei'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'

export function Lighting() {
  const teamId = useF1Store((s) => s.selectedTeamId)
  const aero = useF1Store((s) => s.aerodynamicMode)
  const floorView = useF1Store((s) => s.floorView)
  const team = teamById(teamId)
  return <>
    <ambientLight intensity={floorView ? .1 : aero ? .035 : .055} />
    <directionalLight
      position={[4, 9, 5]}
      intensity={floorView ? .48 : aero ? .72 : 1.28}
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
    <spotLight position={[-6, 4.6, 3.5]} intensity={aero ? .16 : .44} angle={.4} penumbra={1} color={team.primaryColor} castShadow />
    <spotLight position={[4.8, 3.8, -5.6]} intensity={aero ? .72 : 1.16} angle={.48} penumbra={1} color={aero ? '#dce8eb' : '#f7fbff'} />
    <rectAreaLight position={[0, 6.35, .25]} rotation={[-Math.PI / 2,0,0]} width={2.25} height={10.5} intensity={aero ? 1.55 : 3.65} color="#f4f7f8" />
    <rectAreaLight position={[-4.9, 2.65, .75]} rotation={[0, Math.PI / 2, 0]} width={7.8} height={.72} intensity={aero ? .72 : 2.1} color="#dce6e9" />
    <rectAreaLight position={[4.9, 2.15, -.8]} rotation={[0, -Math.PI / 2, 0]} width={6.9} height={.62} intensity={aero ? .54 : 1.58} color="#ffffff" />
    {!aero && <rectAreaLight position={[0, 1.2, -6.2]} rotation={[0,0,0]} width={8.5} height={.52} intensity={1.05} color="#cfd9dd" />}
    {!floorView && <Environment
      files="/assets/hdr/studio_small_03_1k.hdr"
      background={false}
      environmentIntensity={aero ? .48 : .82}
    />}
    {floorView && <>
      <directionalLight position={[5, -6, 6]} intensity={2.25} color="#dcefff" />
      <directionalLight position={[-4, -3, -5]} intensity={1.15} color="#ffffff" />
    </>}
  </>
}
