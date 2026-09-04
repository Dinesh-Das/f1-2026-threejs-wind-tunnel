import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, Bloom, N8AO, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { CarScene } from './CarScene'
import { GarageEnvironment } from './GarageEnvironment'
import { WindTunnelEnvironment } from './WindTunnelEnvironment'
import { useF1Store } from '../store/useF1Store'

export function Experience() {
  const quality = useF1Store((s) => s.quality)
  const aero = useF1Store((s) => s.aerodynamicMode)
  return (
    <Canvas
      className="f1-canvas"
      dpr={quality === 'ULTRA' ? [1.5, 2] : quality === 'HIGH' ? [1.25, 1.75] : quality === 'MEDIUM' ? [1, 1.5] : [1, 1.25]}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      shadows={quality !== 'LOW'}
      camera={{ position: [7.2, 2.8, 8.8], fov: 34, near: .05, far: 120 }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.08
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={[aero ? '#04080a' : '#050607']} />
      <fog attach="fog" args={[aero ? '#04080a' : '#050607', 14, 34]} />
      <Lighting />
      <GarageEnvironment />
      <WindTunnelEnvironment />
      <CarScene />
      <CameraRig />
      <AdaptiveDpr />
      {quality !== 'LOW' && <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
        <N8AO quality={quality === 'ULTRA' ? 'high' : 'medium'} aoRadius={.55} distanceFalloff={.8} intensity={.85} halfRes screenSpaceRadius={false} />
        <SMAA />
        <Bloom intensity={quality === 'ULTRA' ? .18 : .11} luminanceThreshold={1.35} mipmapBlur />
      </EffectComposer>}
    </Canvas>
  )
}
