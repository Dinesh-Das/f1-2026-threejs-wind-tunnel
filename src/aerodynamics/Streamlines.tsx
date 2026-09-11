import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'
import { FLOW_SCENARIOS, integrateProxyStreamline } from './flowModel'

export function Streamlines() {
  const density = useF1Store((s) => s.streamlineDensity)
  const quality = useF1Store((s) => s.quality)
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const geometry = teamById(selectedTeamId).geometry
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const requested = density === 'Ultra' ? 40 : density === 'High' ? 30 : density === 'Medium' ? 22 : 10
  const qualityCap = quality === 'ULTRA' ? 36 : quality === 'HIGH' ? 26 : quality === 'MEDIUM' ? 18 : 10
  const n = Math.min(requested, qualityCap)
  const lines = useMemo(() => Array.from({length:n},(_,i) => {
    const x = ((i % 9)-4)*.48
    const y = -.25 + Math.floor(i/9)*.46
    return integrateProxyStreamline(x, y, geometry, scenario, windRatio, i * .73)
      .map((point) => new THREE.Vector3(point.x, point.y, point.z))
  }),[n, scenario, geometry, windRatio])
  return <group>{lines.map((pts,i) => <Line key={i} points={pts} color={i%3===0?'#d4e5e8':'#78aeb8'} lineWidth={i%3===0?.9:.5} transparent opacity={.11 + windRatio*.25} />)}</group>
}
