import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import airflowVertex from '../shaders/airflow.vert?raw'
import airflowFragment from '../shaders/airflow.frag?raw'
import { useF1Store } from '../store/useF1Store'
import { FLOW_SCENARIOS } from './core/flowScenarios'
import { useGeometryFieldSnapshot } from './core/geometryFieldRegistry'

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function FlowParticles() {
  const quality = useF1Store((s) => s.quality)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const yawDeg = useF1Store((s) => s.yawDeg)
  const density = useF1Store((s) => s.particleDensity)
  const flowPreset = useF1Store((s) => s.flowPreset)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const material = useRef<THREE.ShaderMaterial>(null)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const snapshot = useGeometryFieldSnapshot(selectedTeamId)
  const requested = density === 'Ultra' ? 35000 : density === 'High' ? 20000 : density === 'Medium' ? 10000 : 4000
  const qualityCap = quality === 'ULTRA' ? 35000 : quality === 'HIGH' ? 24000 : quality === 'MEDIUM' ? 12000 : 5000
  const count = Math.min(requested, qualityCap)
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3)
    const random = seededRandom(2026 + count)
    for (let i = 0; i < count; i++) {
      a[i * 3] = (random() - 0.5) * 8
      a[i * 3 + 1] = random() * 3.5 - 0.45
      a[i * 3 + 2] = (random() - 0.5) * 20
    }
    return a
  }, [count])
  const obstacleUniforms = useMemo(() => {
    const mins = Array.from({ length: 12 }, () => new THREE.Vector3(99, 99, 99))
    const maxs = Array.from({ length: 12 }, () => new THREE.Vector3(100, 100, 100))
    const source = snapshot?.obstacles.slice(0, 12) ?? []
    source.forEach((obstacle, index) => {
      mins[index].fromArray(obstacle.min)
      maxs[index].fromArray(obstacle.max)
    })
    return { mins, maxs, count: source.length }
  }, [snapshot])
  useFrame((state) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = state.clock.elapsedTime
    material.current.uniforms.uSpeed.value = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
    material.current.uniforms.uYaw.value = (yawDeg * Math.PI) / 180
    material.current.uniforms.uTurbulence.value = scenario.turbulence
    material.current.uniforms.uWake.value = scenario.wakeStrength
    material.current.uniforms.uFloor.value = scenario.floorStrength
    material.current.uniforms.uWakeDeficit.value = scenario.wakeDeficit
    material.current.uniforms.uObstacleCount.value = obstacleUniforms.count
    material.current.uniforms.uObstacleMin.value = obstacleUniforms.mins
    material.current.uniforms.uObstacleMax.value = obstacleUniforms.maxs
  })
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        vertexShader={airflowVertex}
        fragmentShader={airflowFragment}
        uniforms={{
          uTime: { value: 0 },
          uSpeed: { value: windSpeed / 350 },
          uYaw: { value: (yawDeg * Math.PI) / 180 },
          uTurbulence: { value: scenario.turbulence },
          uWake: { value: scenario.wakeStrength },
          uFloor: { value: scenario.floorStrength },
          uWakeDeficit: { value: scenario.wakeDeficit },
          uObstacleCount: { value: obstacleUniforms.count },
          uObstacleMin: { value: obstacleUniforms.mins },
          uObstacleMax: { value: obstacleUniforms.maxs },
          uColor: { value: new THREE.Color('#a9cbd2') },
        }}
      />
    </points>
  )
}
