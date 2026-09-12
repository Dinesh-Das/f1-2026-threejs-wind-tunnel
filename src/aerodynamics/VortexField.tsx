import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { useAeroField } from './core/useAeroField'

export function VortexField() {
  const windSpeed = useF1Store((s) => s.windSpeed)
  const quality = useF1Store((s) => s.quality)
  const provider = useAeroField()
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const spacing = quality === 'ULTRA' ? 0.6 : quality === 'HIGH' ? 0.75 : quality === 'MEDIUM' ? 0.95 : 1.2
  const glyphs = useMemo(() => {
    const result: Array<{ points: THREE.Vector3[]; strength: number }> = []
    for (let z = -6; z <= 3; z += spacing) {
      for (let x = -2.4; x <= 2.4; x += spacing) {
        const sample = provider.sample(x, 0.18, z, x * 3.1 + z * 1.7)
        if (sample.vorticity < 0.12) continue
        const strength = Math.min(sample.vorticity, 1)
        const radius = 0.07 + strength * 0.16
        result.push({
          strength,
          points: [
            new THREE.Vector3(x - radius, 0.18, z),
            new THREE.Vector3(x, 0.18 + radius * 0.65, z - radius * 0.35),
            new THREE.Vector3(x + radius, 0.18, z - radius * 0.7),
          ],
        })
      }
    }
    return result
  }, [provider, spacing])
  return (
    <group>
      {glyphs.map((glyph, index) => (
        <Line
          key={index}
          points={glyph.points}
          color="#aaa6bb"
          lineWidth={0.7 + glyph.strength}
          transparent
          opacity={(0.08 + glyph.strength * 0.38) * windRatio}
        />
      ))}
    </group>
  )
}
