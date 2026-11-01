import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'
import { carManifestForTeam } from '../src/cars/carAssetManifest'
import { validateCarManifest } from '../src/cars/assetValidation'
import { measureMappedWheelbaseScene, validateLoadedCarAsset } from '../src/cars/runtimeAssetValidation'

describe('original detailed reference car', () => {
  it.each([0, 1])('preserves mapped geometry and wheelbase in lower detail level %i', async (index) => {
    const manifest = carManifestForTeam('mclaren')
    const path = manifest.lodPaths![index]
    const bytes = readFileSync(join(process.cwd(), 'public', path))
    const { scene } = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    )
    expect(measureMappedWheelbaseScene(scene, manifest)).toBeCloseTo(3.4, 5)
    scene.scale.setScalar(manifest.worldScale)
    expect(validateLoadedCarAsset(scene, manifest)).toEqual([])
  })
  it('ships a detailed GLB with working semantics, wheel pivots and distinct active flaps', async () => {
    const manifest = carManifestForTeam('mclaren')
    expect(manifest.accuracy).toBe('high-detail-reference-recreation')
    expect(manifest.fallbackForTeam).toBe(true)
    expect(validateCarManifest(manifest)).toEqual([])
    const bytes = readFileSync(join(process.cwd(), 'public', manifest.modelPath))
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const { scene } = await new GLTFLoader().parseAsync(buffer, '')
    let triangles = 0
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3
        expect(object.geometry.boundingSphere?.radius ?? 0).toBeGreaterThan(0)
      }
    })
    expect(triangles).toBeGreaterThan(150_000)
    expect(triangles).toBeLessThan(500_000)
    expect(new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3()).x).toBeLessThanOrEqual(1.9)
    expect(measureMappedWheelbaseScene(scene, manifest)).toBeCloseTo(3.4, 5)
    for (const [position, names] of Object.entries(manifest.wheelNodes)) {
      const wheel = scene.getObjectByName(names[0])!
      expect(wheel).toBeDefined()
      expect(manifest.wheelRotationAxes?.[position as keyof typeof manifest.wheelNodes]).toBe('x')
      // Every wheel's local geometry is centred around its axle, so rotation
      // cannot send an offset rim, tire or sidewall marking orbiting the car.
      const centre = new THREE.Box3().setFromObject(wheel).getCenter(new THREE.Vector3())
      expect(centre.distanceTo(wheel.getWorldPosition(new THREE.Vector3()))).toBeLessThan(0.015)
    }
    scene.scale.setScalar(manifest.worldScale)
    scene.updateMatrixWorld(true)
    expect(validateLoadedCarAsset(scene, manifest)).toEqual([])
  })
})
