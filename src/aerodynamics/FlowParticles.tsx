import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import airflowVertex from '../shaders/airflow.vert?raw'
import airflowFragment from '../shaders/airflow.frag?raw'
import { useF1Store } from '../store/useF1Store'
import { teamById } from '../data/teams'
import { FLOW_SCENARIOS } from './flowModel'

export function FlowParticles() {
  const quality = useF1Store((s) => s.quality)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const flowPreset = useF1Store((s) => s.flowPreset)
  const selectedTeamId = useF1Store((s) => s.selectedTeamId)
  const material = useRef<THREE.ShaderMaterial>(null)
  const scenario = FLOW_SCENARIOS[flowPreset]
  const geometry = teamById(selectedTeamId).geometry
  const count = quality === 'ULTRA' ? 80000 : quality === 'HIGH' ? 42000 : quality === 'MEDIUM' ? 22000 : 9000
  const positions = useMemo(() => {
    const a = new Float32Array(count*3)
    for (let i=0;i<count;i++) { a[i*3]=(Math.random()-.5)*8; a[i*3+1]=Math.random()*3.5-.45; a[i*3+2]=(Math.random()-.5)*20 }
    return a
  }, [count])
  useFrame((state) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = state.clock.elapsedTime
    material.current.uniforms.uSpeed.value = THREE.MathUtils.clamp(windSpeed / 350, 0, 1)
    material.current.uniforms.uYaw.value = scenario.yaw
    material.current.uniforms.uTurbulence.value = scenario.turbulence
    material.current.uniforms.uWake.value = scenario.wake
    material.current.uniforms.uFloor.value = scenario.floor
    material.current.uniforms.uLateral.value = scenario.lateralDeflection
    material.current.uniforms.uWakeDeficit.value = scenario.wakeDeficit
    material.current.uniforms.uNoseWidth.value = geometry.noseTipWidth
    material.current.uniforms.uSidepodWidth.value = geometry.sidepodWidth
    material.current.uniforms.uUndercut.value = geometry.sidepodUndercut
    material.current.uniforms.uFloorWidth.value = geometry.floorEdgeWidth
    material.current.uniforms.uDiffuser.value = geometry.diffuserExpansion
    material.current.uniforms.uRearWing.value = geometry.rearWingCamber
  })
  return <points frustumCulled={false}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]} /></bufferGeometry>
    <shaderMaterial ref={material} transparent depthWrite={false} blending={THREE.NormalBlending} vertexShader={airflowVertex} fragmentShader={airflowFragment} uniforms={{
      uTime:{value:0},
      uSpeed:{value:windSpeed/350},
      uYaw:{value:scenario.yaw},
      uTurbulence:{value:scenario.turbulence},
      uWake:{value:scenario.wake},
      uFloor:{value:scenario.floor},
      uLateral:{value:scenario.lateralDeflection},
      uWakeDeficit:{value:scenario.wakeDeficit},
      uNoseWidth:{value:geometry.noseTipWidth},
      uSidepodWidth:{value:geometry.sidepodWidth},
      uUndercut:{value:geometry.sidepodUndercut},
      uFloorWidth:{value:geometry.floorEdgeWidth},
      uDiffuser:{value:geometry.diffuserExpansion},
      uRearWing:{value:geometry.rearWingCamber},
      uColor:{value:new THREE.Color('#a9cbd2')},
    }} />
  </points>
}
