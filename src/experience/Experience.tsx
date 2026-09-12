import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, Bloom, N8AO, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { CarScene } from './CarScene'
import { GarageEnvironment } from './GarageEnvironment'
import { WindTunnelEnvironment } from './WindTunnelEnvironment'
import { PerformanceTelemetry } from './PerformanceTelemetry'
import { useF1Store } from '../store/useF1Store'

export function Experience() {
  const quality = useF1Store((s) => s.quality)
  const aero = useF1Store((s) => s.aerodynamicMode)
  return (
    <Canvas
      className="f1-canvas"
      dpr={quality === 'ULTRA' ? [1.25, 1.75] : quality === 'HIGH' ? [1.1, 1.5] : quality === 'MEDIUM' ? [1, 1.25] : 1}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      shadows={quality !== 'LOW'}
      camera={{ position: [10, 2.65, 12], fov: 34, near: 0.05, far: 120 }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.96
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
      <PerformanceTelemetry />
      <AdaptiveDpr />
      {(quality === 'HIGH' || quality === 'ULTRA') && (
        <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
          {quality === 'ULTRA' && (
            <N8AO
              quality="high"
              aoRadius={0.4}
              distanceFalloff={0.84}
              intensity={0.78}
              halfRes
              screenSpaceRadius={false}
            />
          )}
          <SMAA />
          <Bloom intensity={quality === 'ULTRA' ? 0.075 : 0.035} luminanceThreshold={1.7} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  )
}
