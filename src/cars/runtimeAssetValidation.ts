import * as THREE from 'three'
import { F1_2026_REFERENCE } from '../data/f1Reference'
import type { AssetValidationIssue } from './assetValidation'
import type { CarAssetManifest, WheelPosition } from './carAssetManifest'
import { findMappedObject } from './nodeMapping'

const WHEEL_POSITIONS: WheelPosition[] = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']

function isProductionAsset(manifest: CarAssetManifest) {
  return manifest.accuracy === 'licensed-team-model' || manifest.accuracy === 'high-detail-reference-recreation'
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function mappedWheelCentre(root: THREE.Object3D, names: string[]) {
  const positions = names
    .map((name) => findMappedObject(root, name))
    .filter((object): object is THREE.Object3D => Boolean(object))
    .map((object) => object.getWorldPosition(new THREE.Vector3()))

  if (!positions.length) return null
  return new THREE.Vector3(
    average(positions.map((position) => position.x)),
    average(positions.map((position) => position.y)),
    average(positions.map((position) => position.z)),
  )
}

/**
 * Measures wheelbase using the manifest's explicit wheel mappings. The runtime
 * assumes the car has already been aligned so its longitudinal axis is scene Z.
 */
export function measureMappedWheelbaseScene(root: THREE.Object3D, manifest: CarAssetManifest) {
  root.updateMatrixWorld(true)
  const front = [
    mappedWheelCentre(root, manifest.wheelNodes.frontLeft),
    mappedWheelCentre(root, manifest.wheelNodes.frontRight),
  ].filter((point): point is THREE.Vector3 => Boolean(point))
  const rear = [
    mappedWheelCentre(root, manifest.wheelNodes.rearLeft),
    mappedWheelCentre(root, manifest.wheelNodes.rearRight),
  ].filter((point): point is THREE.Vector3 => Boolean(point))

  if (!front.length || !rear.length) return null
  const frontZ = average(front.map((point) => point.z))
  const rearZ = average(rear.map((point) => point.z))
  const wheelbase = Math.abs(frontZ - rearZ)
  return Number.isFinite(wheelbase) && wheelbase > 0.001 ? wheelbase : null
}

function missingNames(root: THREE.Object3D, names: string[]) {
  return names.filter((name) => !findMappedObject(root, name))
}

export function validateLoadedCarAsset(
  root: THREE.Object3D,
  manifest: CarAssetManifest,
  bounds = new THREE.Box3().setFromObject(root),
): AssetValidationIssue[] {
  root.updateMatrixWorld(true)
  const issues: AssetValidationIssue[] = []
  const production = isProductionAsset(manifest)
  const missingSeverity: AssetValidationIssue['severity'] = production ? 'error' : 'warning'

  for (const wheel of WHEEL_POSITIONS) {
    if (manifest.wheelNodes[wheel].length && !manifest.wheelNodes[wheel].some((name) => findMappedObject(root, name))) {
      issues.push({
        severity: missingSeverity,
        code: `loaded-wheel-node-${wheel}`,
        message: `Loaded asset does not contain any declared ${wheel} wheel node.`,
      })
    }
  }

  for (const [semantic, names] of Object.entries(manifest.semantics)) {
    if (!names?.length) continue
    const missing = missingNames(root, names)
    if (missing.length) {
      issues.push({
        severity: missingSeverity,
        code: `loaded-semantic-${semantic}`,
        message: `Loaded asset is missing declared ${semantic} node(s): ${missing.join(', ')}.`,
      })
    }
  }

  const mappedActiveObjects: THREE.Object3D[] = []
  for (const [system, mapping] of [
    ['front', manifest.activeAero.front],
    ['rear', manifest.activeAero.rear],
  ] as const) {
    if (!mapping) continue
    for (const node of mapping.nodes) {
      const object = findMappedObject(root, node.name)
      if (!object) {
        issues.push({
          severity: missingSeverity,
          code: `loaded-active-aero-${system}`,
          message: `Loaded asset is missing declared ${system} active-aero node ${node.name}.`,
        })
      } else {
        mappedActiveObjects.push(object)
      }
    }
  }

  const mappedActiveSet = new Set(mappedActiveObjects)
  for (const object of mappedActiveObjects) {
    let ancestor = object.parent
    while (ancestor && ancestor !== root.parent) {
      if (mappedActiveSet.has(ancestor)) {
        issues.push({
          severity: production ? 'error' : 'warning',
          code: 'loaded-active-aero-nested-node',
          message: `Active-aero node ${object.name} is nested under mapped active-aero node ${ancestor.name}.`,
        })
        break
      }
      if (ancestor === root) break
      ancestor = ancestor.parent
    }
  }

  const wheelbaseScene = measureMappedWheelbaseScene(root, manifest)
  if (!wheelbaseScene) {
    issues.push({
      severity: production ? 'error' : 'warning',
      code: 'loaded-wheelbase-unavailable',
      message: 'Loaded asset wheelbase cannot be measured from the declared wheel mappings.',
    })
  } else {
    const wheelbaseM = wheelbaseScene / F1_2026_REFERENCE.sceneUnitsPerMetre
    const toleranceM = Math.max(0.12, manifest.expected.wheelbaseM * 0.04)
    if (Math.abs(wheelbaseM - manifest.expected.wheelbaseM) > toleranceM) {
      issues.push({
        severity: production ? 'error' : 'warning',
        code: 'loaded-wheelbase-scale',
        message: `Loaded wheelbase ${wheelbaseM.toFixed(2)} m does not match manifest expectation ${manifest.expected.wheelbaseM.toFixed(2)} m within ${toleranceM.toFixed(2)} m.`,
      })
    }
  }

  if (!bounds.isEmpty()) {
    const size = bounds.getSize(new THREE.Vector3())
    const widthM = size.x / F1_2026_REFERENCE.sceneUnitsPerMetre
    if (!Number.isFinite(widthM) || widthM <= 0) {
      issues.push({
        severity: 'error',
        code: 'loaded-width-invalid',
        message: 'Loaded asset width is not finite and positive.',
      })
    } else if (widthM > manifest.expected.maxWidthM + 0.06) {
      issues.push({
        severity: production ? 'error' : 'warning',
        code: 'loaded-width-scale',
        message: `Loaded width ${widthM.toFixed(2)} m exceeds manifest maximum ${manifest.expected.maxWidthM.toFixed(2)} m.`,
      })
    }
  }

  return issues
}
