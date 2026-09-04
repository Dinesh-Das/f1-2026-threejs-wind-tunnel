import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'
import { FLOW_SCENARIOS, sampleProxyFlow } from './flowModel'

export function VelocityField() {
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const geometry = teamById(selectedTeamId).geometry
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const tracks = useMemo(
    () => [-.9,-.45,0,.45,.9].map((x, lineIndex) =>
      Array.from({ length: 26 }, (_, sampleIndex) => {
        const z = 5.0 - sampleIndex * .39
        const sample = sampleProxyFlow(x, -.4, z, geometry, scenario, windRatio, lineIndex * 2.1 + sampleIndex * .17)
        return new THREE.Vector3(x + sample.dx, -.4 + sample.dy, z + sample.dz)
      }),
    ),
    [geometry, scenario, windRatio],
  )
  return <group>{tracks.map((points, i) => <Line key={i} points={points} color="#58f0ff" lineWidth={1.2 + windRatio*1.4} transparent opacity={.16 + windRatio*.52} />)}</group>
}
