import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { integrateGeometryStreamline } from './providers/GeometryProxyFieldProvider'
import { useAeroField } from './core/useAeroField'

export function Streamlines() {
  const density = useF1Store((s) => s.streamlineDensity)
  const quality = useF1Store((s) => s.quality)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const provider = useAeroField()
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const requested = density === 'Ultra' ? 40 : density === 'High' ? 30 : density === 'Medium' ? 22 : 10
  const qualityCap = quality === 'ULTRA' ? 36 : quality === 'HIGH' ? 26 : quality === 'MEDIUM' ? 18 : 10
  const n = Math.min(requested, qualityCap)
  const lines = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const x = ((i % 9) - 4) * 0.48
        const y = -0.25 + Math.floor(i / 9) * 0.46
        return integrateGeometryStreamline(provider, x, y, i * 0.73).map(
          (point) => new THREE.Vector3(point.x, point.y, point.z),
        )
      }),
    [n, provider],
  )
  return (
    <group>
      {lines.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color={i % 3 === 0 ? '#d4e5e8' : '#78aeb8'}
          lineWidth={i % 3 === 0 ? 0.9 : 0.5}
          transparent
          opacity={0.11 + windRatio * 0.25}
        />
      ))}
    </group>
  )
}
