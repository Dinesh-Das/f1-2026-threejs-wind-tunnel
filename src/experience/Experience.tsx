import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { EffectComposer, Bloom, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
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
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.AgXToneMapping }}
      shadows={quality !== 'LOW'}
      camera={{ position: [9.6, 2.8, 11.8], fov: 31, near: 0.05, far: 120 }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.04
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={[aero ? '#080e11' : '#181b1d']} />
      <fog attach="fog" args={[aero ? '#080e11' : '#181b1d', 24, 62]} />
      <Lighting />
      <GarageEnvironment />
      <WindTunnelEnvironment />
      <CarScene />
      <CameraRig />
      <PerformanceTelemetry />
      <AdaptiveDpr />
      {(quality === 'HIGH' || quality === 'ULTRA') && (
        <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
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
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
