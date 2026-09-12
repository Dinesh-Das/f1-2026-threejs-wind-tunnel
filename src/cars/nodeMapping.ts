import * as THREE from 'three'

/**
 * Car manifests intentionally use node names from the source glTF. GLTFLoader
 * sanitizes those names at runtime for animation bindings, so all semantic
 * lookups must cross that boundary consistently.
 */
export function runtimeNodeNameFor(sourceName: string) {
  return THREE.PropertyBinding.sanitizeNodeName(sourceName)
}

export function mappedNodeNameMatches(runtimeName: string, sourceName: string) {
  return runtimeName === sourceName || runtimeName === runtimeNodeNameFor(sourceName)
}

export function findMappedObject(root: THREE.Object3D, sourceName: string) {
  return root.getObjectByName(sourceName) ?? root.getObjectByName(runtimeNodeNameFor(sourceName))
}
