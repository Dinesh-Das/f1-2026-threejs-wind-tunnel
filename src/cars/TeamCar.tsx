import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import type { Team } from '../data/teams'
import { F1_2026_REFERENCE, toSceneUnits } from '../data/f1Reference'
import { useF1Store } from '../store/useF1Store'

const SHARED_BASE_MODEL = '/assets/cars/base/scene.gltf'
const assetManager = THREE.DefaultLoadingManager
THREE.Cache.enabled = true

type Props = {
  team: Team
  position?: [number, number, number]
  scale?: number
  interactive?: boolean
}

type MaterialRole = 'body'|'secondary'|'accent'|'carbon'|'tire'|'rim'|'glass'|'interior'|'generic'

type MaterialRecord = {
  material: THREE.MeshPhysicalMaterial
  role: MaterialRole
  baseColor: THREE.Color
  pressureColor: THREE.Color
  baseEmissive: THREE.Color
  baseEmissiveIntensity: number
  baseOpacity: number
}

type MeshRecord = {
  mesh: THREE.Mesh
  part: string | null
  baseVisible: boolean
  basePosition: THREE.Vector3
  explodeOffset: THREE.Vector3
  explodedPosition: THREE.Vector3
  isAeroFlap: boolean
  baseRotationX: number
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
    case 'frontWing': return new THREE.Vector3(0, 0, 1.35)
    case 'nose': return new THREE.Vector3(0, .2, 1.0)
    case 'suspension': return new THREE.Vector3(side * .85, .2, 0)
    case 'sidepods': return new THREE.Vector3(side * 1.05, .3, 0)
    case 'floor': return new THREE.Vector3(0, -.7, 0)
    case 'diffuser': return new THREE.Vector3(0, -.2, -1.0)
    case 'rearWing': return new THREE.Vector3(0, .45, -1.25)
    case 'halo': return new THREE.Vector3(0, .85, 0)
    case 'wheels': return new THREE.Vector3(side * .95, .12, Math.sign(worldPosition.z || 1) * .35)
    default: return new THREE.Vector3()
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
    firstTrusted + 1 < meshBounds.length
    && meshBounds[firstTrusted].planarSpan > meshBounds[firstTrusted + 1].planarSpan * 3.5
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
  while (
    index + 1 < candidates.length
    && candidates[index].planarSpan > candidates[index + 1].planarSpan * 3.5
  ) {
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

function logicalPartFor(object: THREE.Object3D, team: Team, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
    const declared = declaredPartFor(current)
    if (declared) return declared
    const name = current.name.toUpperCase()
    for (const [part, aliases] of Object.entries(team.meshMap)) {
      if (aliases.some((alias) => name === alias.toUpperCase() || name.includes(alias.toUpperCase()))) return part
    }
    if (current === root) break
    current = current.parent
  }
  return null
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
  if (typeof declared === 'string' && ['body','secondary','accent','carbon','tire','rim','glass','interior','generic'].includes(declared)) {
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
    case 'body': return team.livery.body
    case 'secondary': return team.livery.sidepod
    case 'accent': return team.livery.accent2
    case 'carbon': return '#090b0d'
    case 'tire': return '#111214'
    case 'rim': return team.livery.accent
    case 'glass': return '#0a1419'
    case 'interior': return '#101216'
    default: return team.livery.engineCover
  }
}

function pressureColorFor(role: MaterialRole) {
  if (role === 'tire' || role === 'rim') return '#4d82d8'
  if (role === 'carbon') return '#e87722'
  if (role === 'accent') return '#f7b24a'
  return '#ef5c3d'
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
    map: preserveSourceColorMap ? standard?.map ?? null : null,
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
    roughness: role === 'tire' ? .88 : role === 'carbon' ? .34 : role === 'rim' ? .16 : role === 'glass' ? .08 : team.materials.roughness,
    metalness: role === 'tire' ? .02 : role === 'carbon' ? .45 : role === 'rim' ? .95 : role === 'glass' ? .72 : team.materials.metallic,
    clearcoat: paint ? team.materials.clearcoat : role === 'carbon' ? .35 : 0,
    clearcoatRoughness: paint ? team.materials.clearcoatRoughness : .28,
    envMapIntensity: role === 'tire' ? .35 : role === 'carbon' ? 1.1 : 1.45,
  })
  material.userData = { ...source.userData }
  if (role === 'glass') {
    material.transmission = .12
    material.ior = 1.45
  }
  if (role === 'carbon') material.anisotropy = .35
  return { material, role }
}

function inferredPartFor(object: THREE.Object3D, bounds: InferenceBounds, role: MaterialRole | null) {
  if (role === 'tire' || role === 'rim') return 'wheels'
  const box = new THREE.Box3().setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  const localZ = bounds.size.z > 0 ? (center.z - bounds.center.z) / (bounds.size.z * .5) : 0
  const localY = bounds.size.y > 0 ? (center.y - bounds.box.min.y) / bounds.size.y : 0
  if (localZ > .68 && localY < .58) return 'frontWing'
  if (localZ < -.68 && localY > .42) return 'rearWing'
  if (localY < .15) return localZ < -.48 ? 'diffuser' : 'floor'
  if (localZ > .42) return 'nose'
  if (localZ < -.22) return 'sidepods'
  return role === 'carbon' ? 'suspension' : 'sidepods'
}

export function TeamCar({ team, position = [0, 0, 0], scale = 1, interactive = true }: Props) {
  const gl = useThree((state) => state.gl)
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const records = useRef<MeshRecord[]>([])
  const materials = useRef<MaterialRecord[]>([])
  const teamRef = useRef(team)
  teamRef.current = team
  const exploded = useF1Store((s) => s.exploded)
  const xray = useF1Store((s) => s.xray)
  const pressure = useF1Store((s) => s.pressureMap)
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const floorView = useF1Store((s) => s.floorView)
  const activeAero = useF1Store((s) => s.activeAero)
  const aeroState = useF1Store((s) => s.activeAeroState)
  const selected = useF1Store((s) => s.selectedComponent)
  const set = useF1Store((s) => s.set)
  const highlight = useMemo(() => new THREE.Color(team.secondaryColor), [team.secondaryColor])
  const pressureBlendColor = useMemo(() => new THREE.Color(), [])
  const modelUrl = team.carModel ?? SHARED_BASE_MODEL

  useEffect(() => {
    let cancelled = false
    let loadedScene: THREE.Group | null = null
    setModel(null)
    setLoadFailed(false)
    records.current = []
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
          const preserveSourceColorMap = modelUrl !== SHARED_BASE_MODEL
          if (Array.isArray(object.material)) object.material = object.material.map((material) => toPhysicalMaterial(material, currentTeam, preserveSourceColorMap).material)
          else object.material = toPhysicalMaterial(object.material, currentTeam, preserveSourceColorMap).material
        })

        suppressExtremeGeometryOutliers(scene)

        const initialBox = robustSceneBounds(scene)
        const initialSize = initialBox.getSize(new THREE.Vector3())
        if (initialSize.x > initialSize.z * 1.2) {
          scene.rotation.y = -Math.PI / 2
          scene.updateMatrixWorld(true)
        }
        const wheelbase = measuredWheelbase(scene)
        const alignedBox = robustSceneBounds(scene)
        const alignedSize = alignedBox.getSize(new THREE.Vector3())
        const longestPlanDimension = Math.max(alignedSize.x, alignedSize.z)
        if (wheelbase) {
          scene.scale.setScalar(toSceneUnits(F1_2026_REFERENCE.maxWheelbaseM) / wheelbase)
        } else if (Number.isFinite(longestPlanDimension) && longestPlanDimension > 0) {
          // Fallback only when wheel meshes cannot be identified by hierarchy.
          scene.scale.setScalar(10 / longestPlanDimension)
        }
        if (wheelbase || (Number.isFinite(longestPlanDimension) && longestPlanDimension > 0)) {
          scene.updateMatrixWorld(true)
          const box = robustSceneBounds(scene)
          const center = box.getCenter(new THREE.Vector3())
          scene.position.x -= center.x
          scene.position.z -= center.z
          scene.position.y += -.28 - box.min.y
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
          const firstPhysical = meshMaterials.find((material): material is THREE.MeshPhysicalMaterial => material instanceof THREE.MeshPhysicalMaterial)
          const role = firstPhysical ? materialRole(firstPhysical.name, firstPhysical.userData.f1Role) : null
          const part = logicalPartFor(object, currentTeam, scene) ?? inferredPartFor(object, inferenceBounds, role)
          const worldPosition = object.getWorldPosition(new THREE.Vector3()).sub(rootPosition)
          const basePosition = object.position.clone()
          const explodeOffset = explodedOffsetFor(part, worldPosition)
          meshRecords.push({
            mesh: object,
            part,
            baseVisible: object.visible,
            basePosition,
            explodeOffset,
            explodedPosition: basePosition.clone().add(explodeOffset),
            isAeroFlap: (part === 'rearWing' || part === 'frontWing') && (
              object.userData.f1ActiveAero === true
              || /FLAP|DRS|ACTIVE/i.test(object.name)
              || modelUrl === SHARED_BASE_MODEL
            ),
            baseRotationX: object.rotation.x,
          })
          meshMaterials.forEach((material) => {
            if (!(material instanceof THREE.MeshPhysicalMaterial)) return
            material.transparent = true
            materialRecords.push({
              material,
              role: materialRole(material.name, material.userData.f1Role),
              baseColor: new THREE.Color(roleColor(currentTeam, materialRole(material.name, material.userData.f1Role))),
              pressureColor: new THREE.Color(pressureColorFor(materialRole(material.name, material.userData.f1Role))),
              baseEmissive: material.emissive.clone(),
              baseEmissiveIntensity: material.emissiveIntensity,
              baseOpacity: material.opacity,
            })
          })
        })

        records.current = meshRecords
        materials.current = materialRecords
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
      if (loadedScene) disposeScene(loadedScene)
    }
  }, [gl, modelUrl, team.meshMap])

  useEffect(() => {
    for (const record of materials.current) {
      record.baseColor.set(roleColor(team, record.role))
      const paint = record.role === 'body' || record.role === 'secondary' || record.role === 'accent' || record.role === 'generic'
      record.material.roughness = record.role === 'tire' ? .88 : record.role === 'carbon' ? .34 : record.role === 'rim' ? .16 : record.role === 'glass' ? .08 : team.materials.roughness
      record.material.metalness = record.role === 'tire' ? .02 : record.role === 'carbon' ? .45 : record.role === 'rim' ? .95 : record.role === 'glass' ? .72 : team.materials.metallic
      record.material.clearcoat = paint ? team.materials.clearcoat : record.role === 'carbon' ? .35 : 0
      record.material.clearcoatRoughness = paint ? team.materials.clearcoatRoughness : .28
    }
  }, [team])

  useFrame((_, dt) => {
    if (!model) return
    const blend = 1 - Math.exp(-dt * 6)
    for (const record of records.current) {
      record.mesh.visible = floorView ? record.part === 'floor' || record.part === 'diffuser' : record.baseVisible
      const target = exploded ? record.explodedPosition : record.basePosition
      record.mesh.position.lerp(target, blend)
      const flapTarget = activeAero && aeroState === 'Straight' && record.isAeroFlap ? record.baseRotationX - .09 : record.baseRotationX
      record.mesh.rotation.x = THREE.MathUtils.damp(record.mesh.rotation.x, flapTarget, 6, dt)
    }

    for (const record of materials.current) {
      record.material.opacity = THREE.MathUtils.damp(record.material.opacity, xray ? .24 : record.baseOpacity, 6, dt)
      record.material.depthWrite = !xray
      const targetColor = pressure && windTunnel && windSpeed > 0
        ? pressureBlendColor.copy(record.baseColor).lerp(record.pressureColor, .5)
        : record.baseColor
      record.material.color.lerp(targetColor, blend)
      record.material.emissive.lerp(record.baseEmissive, blend)
      record.material.emissiveIntensity = THREE.MathUtils.damp(record.material.emissiveIntensity, record.baseEmissiveIntensity, 6, dt)
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
    const part = records.current.find((record) => record.mesh === event.object)?.part ?? logicalPartFor(event.object, team, model)
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
