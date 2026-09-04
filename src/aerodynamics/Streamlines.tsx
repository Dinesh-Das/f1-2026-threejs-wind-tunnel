import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'
import { FLOW_SCENARIOS, integrateProxyStreamline } from './flowModel'

export function Streamlines() {
  const density = useF1Store((s) => s.streamlineDensity)
  const flowPreset = useF1Store((s) => s.flowPreset)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const geometry = teamById(selectedTeamId).geometry
  const windRatio = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
  const n = density === 'Ultra' ? 54 : density === 'High' ? 38 : density === 'Medium' ? 24 : 12
  const lines = useMemo(() => Array.from({length:n},(_,i) => {
    const x = ((i % 9)-4)*.48
    const y = -.25 + Math.floor(i/9)*.46
    return integrateProxyStreamline(x, y, geometry, scenario, windRatio, i * .73)
      .map((point) => new THREE.Vector3(point.x, point.y, point.z))
  }),[n, scenario, geometry, windRatio])
  return <group>{lines.map((pts,i) => <Line key={i} points={pts} color={i%3===0?'#b9f2ff':'#4ac9ff'} lineWidth={i%3===0?1.2:.65} transparent opacity={.16 + windRatio*.34} />)}</group>
}
