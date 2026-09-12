import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { useAeroField } from './core/useAeroField'

export function WakeField() {
  const quality = useF1Store((state) => state.quality)
  const provider = useAeroField()
  const { positions, colors } = useMemo(() => {
    const positionValues: number[] = []
    const colorValues: number[] = []
    const lateralSteps = quality === 'LOW' ? 9 : quality === 'MEDIUM' ? 11 : 15
    const verticalSteps = quality === 'LOW' ? 5 : 7
    const downstreamSteps = quality === 'ULTRA' ? 22 : quality === 'HIGH' ? 18 : 14
    const weak = new THREE.Color('#6e9ca8')
    const strong = new THREE.Color('#75e4ff')
    const color = new THREE.Color()

    for (let zi = 0; zi < downstreamSteps; zi += 1) {
      const z = -3.8 - (5.8 * zi) / Math.max(downstreamSteps - 1, 1)
      for (let xi = 0; xi < lateralSteps; xi += 1) {
        const x = -2.35 + (4.7 * xi) / Math.max(lateralSteps - 1, 1)
        for (let yi = 0; yi < verticalSteps; yi += 1) {
          const y = -0.25 + (2.15 * yi) / Math.max(verticalSteps - 1, 1)
          const sample = provider.sample(x, y, z, zi * 0.21 + xi * 0.41 + yi * 0.17)
          if (sample.solid) continue
          const deficit = THREE.MathUtils.clamp(1 - sample.speedRatio, 0, 1)
          const signal = Math.max(deficit, sample.vorticity * 0.45)
          if (signal < 0.055) continue
          color.copy(weak).lerp(strong, THREE.MathUtils.clamp(signal * 1.8, 0, 1))
          positionValues.push(x, y, z)
          colorValues.push(color.r, color.g, color.b)
        }
      }
    }

    return {
      positions: new Float32Array(positionValues),
      colors: new Float32Array(colorValues),
    }
  }, [provider, quality])

  if (!positions.length) return null
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.075} vertexColors transparent opacity={0.52} depthWrite={false} sizeAttenuation />
    </points>
  )
}
