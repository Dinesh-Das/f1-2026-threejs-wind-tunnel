import { useMemo } from 'react'
import * as THREE from 'three'
import { useAeroField } from './core/useAeroField'

export function FlowSlice() {
  const provider = useAeroField()
  const { positions, colors } = useMemo(() => {
    const positionValues: number[] = []
    const colorValues: number[] = []
    const slow = new THREE.Color('#406b86')
    const free = new THREE.Color('#d9e8eb')
    const fast = new THREE.Color('#60e3ff')
    const color = new THREE.Color()
    const ySteps = 18
    const zSteps = 46

    for (let yi = 0; yi < ySteps; yi += 1) {
      const y = -0.45 + (3 * yi) / (ySteps - 1)
      for (let zi = 0; zi < zSteps; zi += 1) {
        const z = -7.2 + (14.4 * zi) / (zSteps - 1)
        const sample = provider.sample(0, y, z, yi * 0.83 + zi * 0.11)
        if (sample.solid) continue
        const ratio = THREE.MathUtils.clamp(sample.speedRatio, 0, 1.35)
        if (ratio <= 1) color.copy(slow).lerp(free, ratio)
        else color.copy(free).lerp(fast, (ratio - 1) / 0.35)
        positionValues.push(0, y, z)
        colorValues.push(color.r, color.g, color.b)
      }
    }
    return {
      positions: new Float32Array(positionValues),
      colors: new Float32Array(colorValues),
    }
  }, [provider])

  return (
    <group>
      <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[14.4, 3]} />
        <meshBasicMaterial color="#68cce4" transparent opacity={0.025} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.72} depthWrite={false} sizeAttenuation />
      </points>
    </group>
  )
}
