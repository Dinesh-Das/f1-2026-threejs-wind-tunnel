import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { useAeroField } from './core/useAeroField'

export function RelativePressureField() {
  const quality = useF1Store((state) => state.quality)
  const provider = useAeroField()
  const { positions, colors } = useMemo(() => {
    const positionValues: number[] = []
    const colorValues: number[] = []
    const xSteps = quality === 'ULTRA' ? 13 : quality === 'HIGH' ? 11 : 9
    const ySteps = quality === 'LOW' ? 5 : 7
    const zSteps = quality === 'ULTRA' ? 25 : quality === 'HIGH' ? 21 : 17
    const low = new THREE.Color('#2474b8')
    const neutral = new THREE.Color('#d5e2e6')
    const high = new THREE.Color('#e66f3f')
    const color = new THREE.Color()

    for (let xi = 0; xi < xSteps; xi += 1) {
      const x = -2.25 + (4.5 * xi) / Math.max(xSteps - 1, 1)
      for (let yi = 0; yi < ySteps; yi += 1) {
        const y = -0.3 + (2.35 * yi) / Math.max(ySteps - 1, 1)
        for (let zi = 0; zi < zSteps; zi += 1) {
          const z = -5.5 + (11 * zi) / Math.max(zSteps - 1, 1)
          const sample = provider.sample(x, y, z, xi * 2.3 + yi * 0.7 + zi * 0.13)
          if (sample.solid || sample.pressureEstimate === null || Math.abs(sample.pressureEstimate) < 0.08) continue
          const pressure = THREE.MathUtils.clamp(sample.pressureEstimate, -1, 1)
          if (pressure < 0) color.copy(neutral).lerp(low, -pressure)
          else color.copy(neutral).lerp(high, pressure)
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
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.58} depthWrite={false} sizeAttenuation />
    </points>
  )
}
