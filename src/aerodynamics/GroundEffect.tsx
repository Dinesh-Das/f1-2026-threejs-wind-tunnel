import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { integrateGeometryStreamline } from './providers/GeometryProxyFieldProvider'
import { useAeroField } from './core/useAeroField'

const TRACKS = [-0.72, -0.36, 0, 0.36, 0.72] as const

export function GroundEffect() {
  const windSpeed = useF1Store((s) => s.windSpeed)
  const provider = useAeroField()
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const dynamicPressureRatio = windRatio * windRatio
  const lines = useMemo(
    () =>
      TRACKS.map((x, index) =>
        integrateGeometryStreamline(provider, x, -0.49, 40 + index, 48, 0.27).map(
          (point) => new THREE.Vector3(point.x, point.y, point.z),
        ),
      ),
    [provider],
  )
  return (
    <group>
      {lines.map((points, index) => (
        <Line
          key={TRACKS[index]}
          points={points}
          color="#79b9c4"
          lineWidth={1.0 + dynamicPressureRatio * 0.85}
          transparent
          opacity={0.1 + dynamicPressureRatio * 0.42}
        />
      ))}
    </group>
  )
}
