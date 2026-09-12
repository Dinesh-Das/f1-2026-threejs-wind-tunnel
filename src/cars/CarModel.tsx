import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import type { Team } from '../data/teams'
import { toSceneUnits, wheelAngularVelocityRadS } from '../data/f1Reference'
import { useF1Store } from '../store/useF1Store'
import { clearGeometryFieldSnapshot, setGeometryFieldSnapshot } from '../aerodynamics/core/geometryFieldRegistry'
import { findMappedSemantic } from './assetValidation'
import { measureMappedWheelbaseScene, validateLoadedCarAsset } from './runtimeAssetValidation'
import { findMappedObject, mappedNodeNameMatches } from './nodeMapping'
import type {
  ActiveAeroMapping,
  ActiveAeroNodeMapping,
  CarAssetManifest,
  CarSemanticComponent,
  WheelPosition,
} from './carAssetManifest'

const assetManager = THREE.DefaultLoadingManager
THREE.Cache.enabled = true
const reportedSharedFallbackIssues = new Set<string>()

type Props = {
  team: Team
  manifest: CarAssetManifest
  position?: [number, number, number]
  scale?: number
  interactive?: boolean
}

type MaterialRole = 'body' | 'secondary' | 'accent' | 'carbon' | 'tire' | 'rim' | 'glass' | 'interior' | 'generic'

type MaterialRecord = {
  material: THREE.MeshPhysicalMaterial
  role: MaterialRole
  baseColor: THREE.Color
  baseEmissive: THREE.Color
  baseEmissiveIntensity: number
  baseOpacity: number
}

type MeshRecord = {
  mesh: THREE.Mesh
  part: string | null
  wheelAxle: 'front' | 'rear' | null
  wheelSpinAxis: 'x' | 'y' | 'z' | null
  baseVisible: boolean
  basePosition: THREE.Vector3
  explodeOffset: THREE.Vector3
  explodedPosition: THREE.Vector3
}

type ActiveAeroRecord = {
  object: THREE.Object3D
  mapping: ActiveAeroMapping
  node: ActiveAeroNodeMapping
  basePosition: THREE.Vector3
  baseQuaternion: THREE.Quaternion
  axis: THREE.Vector3
  pivot: THREE.Vector3 | null
  baseOffsetFromPivot: THREE.Vector3 | null
  deltaQuaternion: THREE.Quaternion
  workPosition: THREE.Vector3
  currentAngle: number
}

function wheelPositionFor(
  object: THREE.Object3D,
  manifest: CarAssetManifest,
  root: THREE.Object3D,
): WheelPosition | null {
  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
    const currentName = current.name
    if (manifest.wheelNodes.frontLeft.some((name) => mappedNodeNameMatches(currentName, name))) return 'frontLeft'
    if (manifest.wheelNodes.frontRight.some((name) => mappedNodeNameMatches(currentName, name))) return 'frontRight'
    if (manifest.wheelNodes.rearLeft.some((name) => mappedNodeNameMatches(currentName, name))) return 'rearLeft'
    if (manifest.wheelNodes.rearRight.some((name) => mappedNodeNameMatches(currentName, name))) return 'rearRight'
    if (current === root) break
    current = current.parent
  }
  return null
}

function wheelAxleFor(object: THREE.Object3D, manifest: CarAssetManifest, root: THREE.Object3D) {
  const position = wheelPositionFor(object, manifest, root)
  if (position) return position.startsWith('front') ? ('front' as const) : ('rear' as const)
  if (!manifest.fallbackForTeam) return null

  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
    const semantic = findMappedSemantic(current.name, manifest)
    if (semantic === 'frontWheels') return 'front' as const
    if (semantic === 'rearWheels') return 'rear' as const
    if (current === root) break
    current = current.parent
  }
  return null
}

function inferredWheelSpinAxis(mesh: THREE.Mesh): 'x' | 'y' | 'z' {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
  const size = mesh.geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3(1, 1, 1)
  if (size.x <= size.y && size.x <= size.z) return 'x'
  if (size.y <= size.x && size.y <= size.z) return 'y'
  return 'z'
}

type InferenceBounds = {
  box: THREE.Box3
  size: THREE.Vector3
  center: THREE.Vector3
}

function explodedOffsetFor(part: string | null, worldPosition: THREE.Vector3) {
  if (!part) return new THREE.Vector3()
  const side = Math.sign(worldPosition.x || 1)
  switch (part) {
    case 'frontWing':
      return new THREE.Vector3(0, 0, 1.35)
    case 'nose':
      return new THREE.Vector3(0, 0.2, 1.0)
    case 'suspension':
      return new THREE.Vector3(side * 0.85, 0.2, 0)
    case 'sidepods':
      return new THREE.Vector3(side * 1.05, 0.3, 0)
    case 'floor':
      return new THREE.Vector3(0, -0.7, 0)
    case 'diffuser':
      return new THREE.Vector3(0, -0.2, -1.0)
    case 'rearWing':
      return new THREE.Vector3(0, 0.45, -1.25)
    case 'halo':
      return new THREE.Vector3(0, 0.85, 0)
    case 'wheels':
      return new THREE.Vector3(side * 0.95, 0.12, Math.sign(worldPosition.z || 1) * 0.35)
    default:
      return new THREE.Vector3()
  }
}

function hierarchyName(object: THREE.Object3D, root: THREE.Object3D) {
  const names: string[] = []
  let current: THREE.Object3D | null = object
  while (current) {
    if (current.name) names.push(current.name)
    if (current === root) break
    current = current.parent
  }
  return names.join(' ').toUpperCase()
}

function robustSceneBounds(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const meshBounds: Array<{ box: THREE.Box3; planarSpan: number }> = []

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
    const localBox = object.geometry.boundingBox
    if (!localBox || localBox.isEmpty()) return

    const box = localBox.clone().applyMatrix4(object.matrixWorld)
    const size = box.getSize(new THREE.Vector3())
    if (![size.x, size.y, size.z].every(Number.isFinite)) return
    const planarSpan = Math.max(size.x, size.z)
    if (planarSpan > 0) meshBounds.push({ box, planarSpan })
  })

  if (!meshBounds.length) return new THREE.Box3().setFromObject(root)

  // Some third-party assets contain a single malformed detail mesh with a
  // bounding box many times larger than the actual chassis. Keep rendering it,
  // but exclude that geometric outlier from fit/centering calculations.
  meshBounds.sort((a, b) => b.planarSpan - a.planarSpan)
  let firstTrusted = 0
  while (
    firstTrusted + 1 < meshBounds.length &&
    meshBounds[firstTrusted].planarSpan > meshBounds[firstTrusted + 1].planarSpan * 3.5
  ) {
    firstTrusted += 1
  }

  const bounds = new THREE.Box3()
  bounds.makeEmpty()
  for (let i = firstTrusted; i < meshBounds.length; i += 1) bounds.union(meshBounds[i].box)
  return bounds.isEmpty() ? new THREE.Box3().setFromObject(root) : bounds
}

function suppressExtremeGeometryOutliers(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const candidates: Array<{ mesh: THREE.Mesh; planarSpan: number }> = []

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
    const localBox = object.geometry.boundingBox
    if (!localBox || localBox.isEmpty()) return
    const worldBox = localBox.clone().applyMatrix4(object.matrixWorld)
    const size = worldBox.getSize(new THREE.Vector3())
    const planarSpan = Math.max(size.x, size.z)
    if (Number.isFinite(planarSpan) && planarSpan > 0) candidates.push({ mesh: object, planarSpan })
  })

  candidates.sort((a, b) => b.planarSpan - a.planarSpan)
  let index = 0
  while (index + 1 < candidates.length && candidates[index].planarSpan > candidates[index + 1].planarSpan * 3.5) {
    candidates[index].mesh.visible = false
    candidates[index].mesh.userData.geometryOutlier = true
    index += 1
  }
}

function measuredWheelbase(scene: THREE.Object3D) {
  const front: number[] = []
  const rear: number[] = []
  scene.updateMatrixWorld(true)
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const name = hierarchyName(object, scene)
    if (!/WHEEL|TYRE|TIRE/.test(name)) return
    const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
    if (/FRONT|\bFL\b|\bFR\b/.test(name)) front.push(center.z)
    if (/REAR|BACK|\bRL\b|\bRR\b/.test(name)) rear.push(center.z)
  })
  if (!front.length || !rear.length) return null
  const avg = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / items.length
  const wheelbase = Math.abs(avg(front) - avg(rear))
  return wheelbase > 0.001 ? wheelbase : null
}

function declaredPartFor(object: THREE.Object3D) {
  const declared = object.userData.f1Part ?? object.userData.part
  return typeof declared === 'string' && declared.trim() ? declared.trim() : null
}

function semanticToPart(semantic: CarSemanticComponent | null) {
  if (!semantic) return null
  if (semantic === 'frontWing' || semantic === 'frontActiveFlaps') return 'frontWing'
  if (semantic === 'frontSuspension' || semantic === 'rearSuspension') return 'suspension'
  if (semantic === 'frontWheels' || semantic === 'rearWheels') return 'wheels'
  if (semantic === 'bodywork') return 'sidepods'
  return semantic
}

function logicalPartFor(object: THREE.Object3D, manifest: CarAssetManifest, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
    const declared = declaredPartFor(current)
    if (declared) return declared
    const mapped = semanticToPart(findMappedSemantic(current.name, manifest))
    if (mapped) return mapped
    if (current === root) break
    current = current.parent
  }
  return null
}

function axisVector(axis: 'x' | 'y' | 'z') {
  if (axis === 'x') return new THREE.Vector3(1, 0, 0)
  if (axis === 'y') return new THREE.Vector3(0, 1, 0)
  return new THREE.Vector3(0, 0, 1)
}

function collectActiveAeroRecords(root: THREE.Object3D, manifest: CarAssetManifest): ActiveAeroRecord[] {
  const candidates: ActiveAeroRecord[] = []
  for (const mapping of [manifest.activeAero.front, manifest.activeAero.rear]) {
    if (!mapping) continue
    for (const node of mapping.nodes) {
      const object = findMappedObject(root, node.name)
      if (!object) {
        console.warn(`Active-aero node "${node.name}" is missing from ${manifest.modelPath}.`)
        continue
      }
      const pivot = node.pivot.kind === 'parent-local-point' ? new THREE.Vector3(...node.pivot.point) : null
      candidates.push({
        object,
        mapping,
        node,
        basePosition: object.position.clone(),
        baseQuaternion: object.quaternion.clone(),
        axis: axisVector(node.axis),
        pivot,
        baseOffsetFromPivot: pivot ? object.position.clone().sub(pivot) : null,
        deltaQuaternion: new THREE.Quaternion(),
        workPosition: new THREE.Vector3(),
        currentAngle: 0,
      })
    }
  }

  const mappedObjects = new Set(candidates.map((record) => record.object))
  return candidates.filter((record) => {
    let ancestor = record.object.parent
    while (ancestor && ancestor !== root.parent) {
      if (mappedObjects.has(ancestor)) {
        console.warn(
          `Active-aero node "${record.node.name}" is a descendant of another mapped hinge node in ${manifest.modelPath}; ` +
            'the descendant mapping is ignored to avoid applying the hinge transform twice.',
        )
        return false
      }
      if (ancestor === root) break
      ancestor = ancestor.parent
    }
    return true
  })
}

function disposeScene(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry?.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  })
}

function materialRole(name: string, declared?: unknown): MaterialRole {
  if (
    typeof declared === 'string' &&
    ['body', 'secondary', 'accent', 'carbon', 'tire', 'rim', 'glass', 'interior', 'generic'].includes(declared)
  ) {
    return declared as MaterialRole
  }
  const id = name.toLowerCase()
  if (/wheel_tires|tyre|tire/.test(id)) return 'tire'
  if (/rim/.test(id)) return 'rim'
  if (/mirror|display|glass|visor/.test(id)) return 'glass'
  if (/seat|yoke|button/.test(id)) return 'interior'
  if (/support|dark|black|carbon|rod/.test(id)) return 'carbon'
  if (/white|stripe/.test(id)) return 'accent'
  if (/main_body_colour_red|material\.001|material$/.test(id)) return 'body'
  if (/main_body_colour_black/.test(id)) return 'secondary'
  return 'generic'
}

function roleColor(team: Team, role: MaterialRole) {
  switch (role) {
    case 'body':
      return team.livery.body
    case 'secondary':
      return team.livery.sidepod
    case 'accent':
      return team.livery.accent2
    case 'carbon':
      return '#0c0f11'
    case 'tire':
      return '#191a1c'
    case 'rim':
      return team.livery.accent
    case 'glass':
      return '#081216'
    case 'interior':
      return '#141619'
    default:
      return team.livery.engineCover
  }
}

let carbonMicroNormal: THREE.DataTexture | null = null
let rubberMicroNormal: THREE.DataTexture | null = null

function microNormalTexture(kind: 'carbon' | 'rubber') {
  const cached = kind === 'carbon' ? carbonMicroNormal : rubberMicroNormal
  if (cached) return cached

  const size = 64
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4
      let nx = 128
      let ny = 128
      if (kind === 'carbon') {
        const weave = ((x >> 2) + (y >> 2)) & 1
        const diagonal = Math.sin(((x + y) * Math.PI) / 4)
        nx += Math.round((weave ? 1 : -1) * 12 + diagonal * 5)
        ny += Math.round((weave ? -1 : 1) * 12 - diagonal * 5)
      } else {
        const grain = Math.sin(x * 2.17 + y * 5.13) * Math.cos(x * 4.41 - y * 1.73)
        nx += Math.round(grain * 7)
        ny += Math.round(Math.sin(x * 3.31 - y * 2.77) * 6)
      }
      data[i] = nx
      data[i + 1] = ny
      data[i + 2] = 252
      data[i + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(kind === 'carbon' ? 18 : 11, kind === 'carbon' ? 18 : 11)
  texture.needsUpdate = true
  if (kind === 'carbon') carbonMicroNormal = texture
  else rubberMicroNormal = texture
  return texture
}

function applyRealisticFinish(material: THREE.MeshPhysicalMaterial, role: MaterialRole, team: Team) {
  const paint = role === 'body' || role === 'secondary' || role === 'accent' || role === 'generic'
  const satin = team.livery.finish === 'satin'
  const metallic = team.livery.finish === 'metallic'

  if (paint) {
    material.roughness = satin ? 0.34 : metallic ? 0.22 : 0.19
    material.metalness = metallic ? 0.18 : 0.06
    material.clearcoat = satin ? 0.68 : 0.92
    material.clearcoatRoughness = satin ? 0.24 : 0.12
    material.envMapIntensity = 1.55
    material.ior = 1.52
    material.specularIntensity = 0.92
  } else if (role === 'carbon') {
    material.roughness = 0.3
    material.metalness = 0.16
    material.clearcoat = 0.46
    material.clearcoatRoughness = 0.2
    material.envMapIntensity = 1.32
    material.anisotropy = 0.58
    if (!material.normalMap) {
      material.normalMap = microNormalTexture('carbon')
      material.normalScale.set(0.2, 0.2)
    }
  } else if (role === 'tire') {
    material.roughness = 0.82
    material.metalness = 0
    material.clearcoat = 0
    material.envMapIntensity = 0.48
    if (!material.normalMap) {
      material.normalMap = microNormalTexture('rubber')
      material.normalScale.set(0.12, 0.12)
    }
  } else if (role === 'rim') {
    material.roughness = 0.14
    material.metalness = 0.94
    material.clearcoat = 0.16
    material.clearcoatRoughness = 0.12
    material.envMapIntensity = 1.7
  } else if (role === 'glass') {
    material.roughness = 0.055
    material.metalness = 0
    material.clearcoat = 0.35
    material.clearcoatRoughness = 0.08
    material.transmission = 0.34
    material.thickness = 0.045
    material.ior = 1.5
    material.envMapIntensity = 1.42
  } else if (role === 'interior') {
    material.roughness = 0.58
    material.metalness = 0.08
    material.clearcoat = 0.08
    material.envMapIntensity = 0.72
  }

  material.needsUpdate = true
}

function toPhysicalMaterial(source: THREE.Material, team: Team, preserveSourceColorMap: boolean) {
  const standard = source instanceof THREE.MeshStandardMaterial ? source : null
  const role = materialRole(source.name, source.userData.f1Role)
  const paint = role === 'body' || role === 'secondary' || role === 'accent' || role === 'generic'
  const material = new THREE.MeshPhysicalMaterial({
    name: source.name,
    color: new THREE.Color(roleColor(team, role)),
    // A shared chassis is intentionally reskinned rather than reproducing a
    // source livery. Preserve geometric/PBR detail maps, but strip source
    // base-color artwork unless this is an explicitly authorized team asset.
    map: preserveSourceColorMap ? (standard?.map ?? null) : null,
    normalMap: standard?.normalMap ?? null,
    roughnessMap: standard?.roughnessMap ?? null,
    metalnessMap: standard?.metalnessMap ?? null,
    aoMap: standard?.aoMap ?? null,
    emissiveMap: standard?.emissiveMap ?? null,
    alphaMap: standard?.alphaMap ?? null,
    side: source.side,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    roughness: paint ? 0.22 : 0.5,
    metalness: paint && team.livery.finish === 'metallic' ? 0.18 : 0.04,
    clearcoat: paint ? 0.9 : 0,
    clearcoatRoughness: paint ? 0.12 : 0.2,
    envMapIntensity: 1.2,
  })
  material.userData = { ...source.userData }
  applyRealisticFinish(material, role, team)
  return { material, role }
}

function inferredPartFor(object: THREE.Object3D, bounds: InferenceBounds, role: MaterialRole | null) {
  if (role === 'tire' || role === 'rim') return 'wheels'
  const box = new THREE.Box3().setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  const localZ = bounds.size.z > 0 ? (center.z - bounds.center.z) / (bounds.size.z * 0.5) : 0
  const localY = bounds.size.y > 0 ? (center.y - bounds.box.min.y) / bounds.size.y : 0
  if (localZ > 0.68 && localY < 0.58) return 'frontWing'
  if (localZ < -0.68 && localY > 0.42) return 'rearWing'
  if (localY < 0.15) return localZ < -0.48 ? 'diffuser' : 'floor'
  if (localZ > 0.42) return 'nose'
  if (localZ < -0.22) return 'sidepods'
  return role === 'carbon' ? 'suspension' : 'sidepods'
}

export function CarModel({ team, manifest, position = [0, 0, 0], scale = 1, interactive = true }: Props) {
  const gl = useThree((state) => state.gl)
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const records = useRef<MeshRecord[]>([])
  const activeAeroRecords = useRef<ActiveAeroRecord[]>([])
  const materials = useRef<MaterialRecord[]>([])
  const teamRef = useRef(team)
  teamRef.current = team
  const exploded = useF1Store((s) => s.exploded)
  const xray = useF1Store((s) => s.xray)
  const floorView = useF1Store((s) => s.floorView)
  const aeroState = useF1Store((s) => s.activeAeroState)
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const wheelRotation = useF1Store((s) => s.wheelRotation)
  const selected = useF1Store((s) => s.selectedComponent)
  const set = useF1Store((s) => s.set)
  const highlight = useMemo(() => new THREE.Color(team.secondaryColor), [team.secondaryColor])
  const modelUrl = manifest.modelPath

  useEffect(() => {
    let cancelled = false
    let loadedScene: THREE.Group | null = null
    setModel(null)
    setLoadFailed(false)
    records.current = []
    activeAeroRecords.current = []
    materials.current = []

    const loader = new GLTFLoader(assetManager)
    const draco = new DRACOLoader(assetManager)
    draco.setDecoderPath('/assets/draco/')
    loader.setDRACOLoader(draco)
    const ktx2 = new KTX2Loader(assetManager)
    ktx2.setTranscoderPath('/assets/basis/').detectSupport(gl)
    loader.setKTX2Loader(ktx2)
    loader.load(
      modelUrl,
      (gltf) => {
        const currentTeam = teamRef.current
        const scene = gltf.scene.clone(true)
        if (cancelled) {
          disposeScene(scene)
          return
        }

        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          object.geometry = object.geometry.clone()
          object.castShadow = true
          object.receiveShadow = true
          const preserveSourceColorMap = !manifest.fallbackForTeam
          if (Array.isArray(object.material))
            object.material = object.material.map(
              (material) => toPhysicalMaterial(material, currentTeam, preserveSourceColorMap).material,
            )
          else object.material = toPhysicalMaterial(object.material, currentTeam, preserveSourceColorMap).material
        })

        suppressExtremeGeometryOutliers(scene)

        const initialBox = robustSceneBounds(scene)
        const initialSize = initialBox.getSize(new THREE.Vector3())
        if (initialSize.x > initialSize.z * 1.2) {
          scene.rotation.y = -Math.PI / 2
          scene.updateMatrixWorld(true)
        }
        scene.scale.setScalar(manifest.worldScale)
        scene.updateMatrixWorld(true)
        const mappedWheelbase = measureMappedWheelbaseScene(scene, manifest)
        const wheelbase = mappedWheelbase ?? (manifest.fallbackForTeam ? measuredWheelbase(scene) : null)
        const alignedBox = robustSceneBounds(scene)
        const alignedSize = alignedBox.getSize(new THREE.Vector3())
        const longestPlanDimension = Math.max(alignedSize.x, alignedSize.z)
        if (manifest.fallbackForTeam && wheelbase) {
          scene.scale.multiplyScalar(toSceneUnits(manifest.expected.wheelbaseM) / wheelbase)
        } else if (manifest.fallbackForTeam && Number.isFinite(longestPlanDimension) && longestPlanDimension > 0) {
          // Fallback only when wheel meshes cannot be identified by hierarchy.
          scene.scale.multiplyScalar(toSceneUnits(manifest.expected.wheelbaseM) / (longestPlanDimension * 0.7))
        }
        if (wheelbase || (Number.isFinite(longestPlanDimension) && longestPlanDimension > 0)) {
          scene.updateMatrixWorld(true)
          const box = robustSceneBounds(scene)
          const center = box.getCenter(new THREE.Vector3())
          scene.position.x -= center.x
          scene.position.z -= center.z
          scene.position.y += -0.28 - box.min.y
        }

        scene.updateMatrixWorld(true)
        const loadedAssetIssues = validateLoadedCarAsset(scene, manifest, robustSceneBounds(scene))
        for (const issue of loadedAssetIssues) {
          const sharedFallbackKey = `${manifest.modelPath}:${issue.code}:${issue.message}`
          if (manifest.fallbackForTeam && reportedSharedFallbackIssues.has(sharedFallbackKey)) continue
          if (manifest.fallbackForTeam) reportedSharedFallbackIssues.add(sharedFallbackKey)
          const scope = manifest.fallbackForTeam
            ? `shared fallback:${manifest.modelPath}`
            : `car asset:${manifest.teamId}`
          const message = `[${scope}] ${issue.message}`
          if (issue.severity === 'error') console.error(message)
          else console.warn(message)
        }

        scene.updateMatrixWorld(true)
        const meshRecords: MeshRecord[] = []
        const materialRecords: MaterialRecord[] = []
        const rootPosition = scene.getWorldPosition(new THREE.Vector3())
        const inferenceBox = robustSceneBounds(scene)
        const inferenceBounds: InferenceBounds = {
          box: inferenceBox,
          size: inferenceBox.getSize(new THREE.Vector3()),
          center: inferenceBox.getCenter(new THREE.Vector3()),
        }
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material]
          const firstPhysical = meshMaterials.find(
            (material): material is THREE.MeshPhysicalMaterial => material instanceof THREE.MeshPhysicalMaterial,
          )
          const role = firstPhysical ? materialRole(firstPhysical.name, firstPhysical.userData.f1Role) : null
          const part =
            logicalPartFor(object, manifest, scene) ??
            (manifest.fallbackForTeam ? inferredPartFor(object, inferenceBounds, role) : null)
          const wheelAxle = wheelAxleFor(object, manifest, scene)
          const wheelPosition = wheelPositionFor(object, manifest, scene)
          const declaredWheelAxis = wheelPosition ? manifest.wheelRotationAxes?.[wheelPosition] : undefined
          const worldPosition = object.getWorldPosition(new THREE.Vector3()).sub(rootPosition)
          const basePosition = object.position.clone()
          const explodeOffset = explodedOffsetFor(part, worldPosition)
          meshRecords.push({
            mesh: object,
            part,
            wheelAxle,
            wheelSpinAxis:
              declaredWheelAxis ?? (wheelAxle && manifest.fallbackForTeam ? inferredWheelSpinAxis(object) : null),
            baseVisible: object.visible,
            basePosition,
            explodeOffset,
            explodedPosition: basePosition.clone().add(explodeOffset),
          })
          meshMaterials.forEach((material) => {
            if (!(material instanceof THREE.MeshPhysicalMaterial)) return
            material.transparent = true
            materialRecords.push({
              material,
              role: materialRole(material.name, material.userData.f1Role),
              baseColor: new THREE.Color(roleColor(currentTeam, materialRole(material.name, material.userData.f1Role))),
              baseEmissive: material.emissive.clone(),
              baseEmissiveIntensity: material.emissiveIntensity,
              baseOpacity: material.opacity,
            })
          })
        })

        records.current = meshRecords
        activeAeroRecords.current = collectActiveAeroRecords(scene, manifest)
        materials.current = materialRecords

        const fieldBounds = robustSceneBounds(scene)
        const obstacles = meshRecords
          .filter((record) => record.part && record.mesh.visible)
          .map((record) => {
            const box = new THREE.Box3().setFromObject(record.mesh)
            return {
              semantic: record.part!,
              min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
              max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
            }
          })
          .filter((obstacle) => obstacle.min.every(Number.isFinite) && obstacle.max.every(Number.isFinite))

        setGeometryFieldSnapshot({
          teamId: manifest.teamId,
          sourceModel: manifest.modelPath,
          bounds: {
            min: [fieldBounds.min.x, fieldBounds.min.y, fieldBounds.min.z],
            max: [fieldBounds.max.x, fieldBounds.max.y, fieldBounds.max.z],
          },
          obstacles,
        })
        loadedScene = scene
        setModel(scene)
      },
      undefined,
      () => {
        if (!cancelled) setLoadFailed(true)
      },
    )

    return () => {
      cancelled = true
      draco.dispose()
      ktx2.dispose()
      clearGeometryFieldSnapshot(manifest.teamId, manifest.modelPath)
      if (loadedScene) disposeScene(loadedScene)
    }
  }, [gl, manifest, modelUrl])

  useEffect(() => {
    for (const record of materials.current) {
      record.baseColor.set(roleColor(team, record.role))
      applyRealisticFinish(record.material, record.role, team)
    }
  }, [team])

  useFrame((_, dt) => {
    if (!model) return
    const blend = 1 - Math.exp(-dt * 6)
    for (const record of records.current) {
      record.mesh.visible = floorView ? record.part === 'floor' || record.part === 'diffuser' : record.baseVisible
      const target = exploded ? record.explodedPosition : record.basePosition
      record.mesh.position.lerp(target, blend)
      if (record.wheelAxle && record.wheelSpinAxis && wheelRotation && windTunnel && windSpeed > 0) {
        record.mesh.rotation[record.wheelSpinAxis] -= wheelAngularVelocityRadS(windSpeed, record.wheelAxle) * dt
      }
    }

    for (const record of activeAeroRecords.current) {
      const targetAngle = THREE.MathUtils.degToRad(
        aeroState === 'Straight' ? record.mapping.straightAngleDeg : record.mapping.cornerAngleDeg,
      )
      record.currentAngle = THREE.MathUtils.damp(record.currentAngle, targetAngle, 6, dt)
      record.deltaQuaternion.setFromAxisAngle(record.axis, record.currentAngle)
      record.object.quaternion.copy(record.baseQuaternion).premultiply(record.deltaQuaternion)

      if (record.pivot && record.baseOffsetFromPivot) {
        record.workPosition.copy(record.baseOffsetFromPivot).applyQuaternion(record.deltaQuaternion).add(record.pivot)
        record.object.position.copy(record.workPosition)
      } else {
        record.object.position.copy(record.basePosition)
      }
    }

    for (const record of materials.current) {
      record.material.opacity = THREE.MathUtils.damp(record.material.opacity, xray ? 0.24 : record.baseOpacity, 6, dt)
      record.material.depthWrite = !xray
      record.material.color.lerp(record.baseColor, blend)
      record.material.emissive.lerp(record.baseEmissive, blend)
      record.material.emissiveIntensity = THREE.MathUtils.damp(
        record.material.emissiveIntensity,
        record.baseEmissiveIntensity,
        6,
        dt,
      )
    }

    if (selected) {
      for (const record of records.current) {
        if (record.part !== selected) continue
        const meshMaterials = Array.isArray(record.mesh.material) ? record.mesh.material : [record.mesh.material]
        for (const material of meshMaterials) {
          if (!(material instanceof THREE.MeshPhysicalMaterial)) continue
          material.emissive.lerp(highlight, blend)
          material.emissiveIntensity = 1.5
        }
      }
    }
  })

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || !model) return
    const part =
      records.current.find((record) => record.mesh === event.object)?.part ??
      logicalPartFor(event.object, manifest, model)
    if (!part) return
    event.stopPropagation()
    set({ selectedComponent: part })
  }

  if (!model || loadFailed) return null

  return (
    <group position={position} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}
