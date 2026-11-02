import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

const SAMPLE_SECONDS = 1

export function PerformanceTelemetry() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const elapsed = useRef(0)
  const frames = useRef(0)

  useFrame((_state, delta) => {
    if (!import.meta.env.DEV) return

    elapsed.current += delta
    frames.current += 1
    if (elapsed.current < SAMPLE_SECONDS) return

    const root = document.documentElement
    root.dataset.f1Fps = (frames.current / elapsed.current).toFixed(1)
    root.dataset.f1FrameMs = ((elapsed.current * 1000) / frames.current).toFixed(2)
    root.dataset.f1Geometries = String(gl.info.memory.geometries)
    root.dataset.f1Textures = String(gl.info.memory.textures)
    root.dataset.f1PixelRatio = gl.getPixelRatio().toFixed(2)
    root.dataset.f1Environment = scene.environmentIntensity.toFixed(2)
    root.dataset.f1ToneMapping = String(gl.toneMapping)
    root.dataset.f1Exposure = gl.toneMappingExposure.toFixed(2)
    root.dataset.f1ShadowMap = String(gl.shadowMap.enabled)
    root.dataset.f1Camera = camera.position
      .toArray()
      .map((v) => v.toFixed(3))
      .join(',')

    elapsed.current = 0
    frames.current = 0
  })

  return null
}
