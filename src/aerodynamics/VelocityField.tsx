import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useF1Store } from '../store/useF1Store'
import { useAeroField } from './core/useAeroField'

type Glyph = {
  position: THREE.Vector3
  direction: THREE.Vector3
  length: number
  color: THREE.Color
}

const UP = new THREE.Vector3(0, 1, 0)

export function VelocityField() {
  const windSpeed = useF1Store((state) => state.windSpeed)
  const quality = useF1Store((state) => state.quality)
  const provider = useAeroField()
  const shaftRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)

  const glyphs = useMemo(() => {
    if (windSpeed <= 0) return []

    const xSteps = quality === 'ULTRA' ? 7 : quality === 'HIGH' ? 6 : quality === 'MEDIUM' ? 5 : 4
    const ySteps = quality === 'ULTRA' ? 5 : quality === 'LOW' ? 3 : 4
    const zSteps = quality === 'ULTRA' ? 10 : quality === 'HIGH' ? 9 : quality === 'MEDIUM' ? 8 : 7
    const slow = new THREE.Color('#7193a3')
    const free = new THREE.Color('#bfeaf2')
    const fast = new THREE.Color('#55e6ff')
    const color = new THREE.Color()
    const values: Glyph[] = []

    for (let xi = 0; xi < xSteps; xi += 1) {
      const x = -2.15 + (4.3 * xi) / Math.max(xSteps - 1, 1)
      for (let yi = 0; yi < ySteps; yi += 1) {
        const y = -0.28 + (2.55 * yi) / Math.max(ySteps - 1, 1)
        for (let zi = 0; zi < zSteps; zi += 1) {
          const z = -6.1 + (12.2 * zi) / Math.max(zSteps - 1, 1)
          const sample = provider.sample(x, y, z, xi * 1.17 + yi * 0.61 + zi * 0.23)
          if (sample.solid) continue

          const direction = new THREE.Vector3(...sample.velocity)
          if (direction.lengthSq() < 1e-8) continue
          direction.normalize()
          const ratio = THREE.MathUtils.clamp(sample.speedRatio, 0, 1.35)
          if (ratio <= 1) color.copy(slow).lerp(free, ratio)
          else color.copy(free).lerp(fast, (ratio - 1) / 0.35)
          values.push({
            position: new THREE.Vector3(x, y, z),
            direction,
            length: 0.24 + ratio * 0.36,
            color: color.clone(),
          })
        }
      }
    }

    return values
  }, [provider, quality, windSpeed])

  useLayoutEffect(() => {
    const shafts = shaftRef.current
    const heads = headRef.current
    if (!shafts || !heads) return

    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()

    glyphs.forEach((glyph, index) => {
      quaternion.setFromUnitVectors(UP, glyph.direction)
      const headLength = Math.min(0.14, glyph.length * 0.32)
      const shaftLength = Math.max(0.04, glyph.length - headLength)

      position.copy(glyph.position).addScaledVector(glyph.direction, shaftLength * 0.5)
      scale.set(0.012, shaftLength, 0.012)
      matrix.compose(position, quaternion, scale)
      shafts.setMatrixAt(index, matrix)
      shafts.setColorAt(index, glyph.color)

      position.copy(glyph.position).addScaledVector(glyph.direction, shaftLength + headLength * 0.5)
      scale.set(0.045, headLength, 0.045)
      matrix.compose(position, quaternion, scale)
      heads.setMatrixAt(index, matrix)
      heads.setColorAt(index, glyph.color)
    })

    shafts.count = glyphs.length
    heads.count = glyphs.length
    shafts.instanceMatrix.needsUpdate = true
    heads.instanceMatrix.needsUpdate = true
    if (shafts.instanceColor) shafts.instanceColor.needsUpdate = true
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true
  }, [glyphs])

  if (!glyphs.length) return null

  return (
    <group>
      <instancedMesh ref={shaftRef} args={[undefined, undefined, glyphs.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial vertexColors transparent opacity={0.72} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, glyphs.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 7]} />
        <meshBasicMaterial vertexColors transparent opacity={0.82} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
