import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Team } from '../data/teams'
import { F1_2026_REFERENCE, toSceneUnits } from '../data/f1Reference'
import { useF1Store } from '../store/useF1Store'
import { F1Car } from './F1Car'

type Props = {
  team: Team
  position?: [number, number, number]
  scale?: number
  interactive?: boolean
}

type MaterialRecord = {
  material: THREE.MeshStandardMaterial
  baseColor: THREE.Color
  baseEmissive: THREE.Color
  baseOpacity: number
}

type MeshRecord = {
  mesh: THREE.Mesh
  part: string | null
  baseVisible: boolean
  basePosition: THREE.Vector3
  explodeOffset: THREE.Vector3
  isAeroFlap: boolean
  baseRotationX: number
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

function measuredWheelbase(scene: THREE.Object3D) {
  const front: number[] = []
  const rear: number[] = []
  scene.updateMatrixWorld(true)
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const name = object.name.toUpperCase()
    if (!/WHEEL|TYRE|TIRE/.test(name)) return
    const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
    if (/FRONT|\bFL\b|\bFR\b/.test(name)) front.push(center.z)
    if (/REAR|\bRL\b|\bRR\b/.test(name)) rear.push(center.z)
  })
  if (!front.length || !rear.length) return null
  const avg = (items: number[]) => items.reduce((sum, value) => sum + value, 0) / items.length
  const wheelbase = Math.abs(avg(front) - avg(rear))
  return wheelbase > 0.001 ? wheelbase : null
}

function logicalPartFor(object: THREE.Object3D, team: Team, root: THREE.Object3D) {
  let current: THREE.Object3D | null = object
  while (current && current !== root.parent) {
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

export function TeamCar({ team, position = [0, 0, 0], scale = 1, interactive = true }: Props) {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const records = useRef<MeshRecord[]>([])
  const materials = useRef<MaterialRecord[]>([])
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
  const pressureColor = useMemo(() => new THREE.Color('#ff4d21'), [])

  useEffect(() => {
    let cancelled = false
    let loadedScene: THREE.Group | null = null
    setModel(null)
    setLoadFailed(false)
    records.current = []
    materials.current = []

    // Proxy teams deliberately have no model URL. This avoids eleven guaranteed
    // GLB 404s while keeping the exact same integration path for licensed assets.
    if (!team.carModel) return

    const loader = new GLTFLoader()
    loader.load(
      team.carModel,
      (gltf) => {
        const scene = gltf.scene.clone(true)
        if (cancelled) {
          disposeScene(scene)
          return
        }

        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          object.castShadow = true
          object.receiveShadow = true
          if (Array.isArray(object.material)) object.material = object.material.map((material) => material.clone())
          else object.material = object.material.clone()
        })

        const initialBox = new THREE.Box3().setFromObject(scene)
        const initialSize = initialBox.getSize(new THREE.Vector3())
        const wheelbase = measuredWheelbase(scene)
        const longestPlanDimension = Math.max(initialSize.x, initialSize.z)
        if (wheelbase) {
          scene.scale.setScalar(toSceneUnits(F1_2026_REFERENCE.maxWheelbaseM) / wheelbase)
        } else if (Number.isFinite(longestPlanDimension) && longestPlanDimension > 0) {
          // Fallback only when wheel meshes cannot be identified. The proxy and
          // mapped production assets should prefer the regulation wheelbase path.
          scene.scale.setScalar(10 / longestPlanDimension)
        }
        if (wheelbase || (Number.isFinite(longestPlanDimension) && longestPlanDimension > 0)) {
          scene.updateMatrixWorld(true)
          const box = new THREE.Box3().setFromObject(scene)
          const center = box.getCenter(new THREE.Vector3())
          scene.position.x -= center.x
          scene.position.z -= center.z
          scene.position.y += -.28 - box.min.y
        }

        scene.updateMatrixWorld(true)
        const meshRecords: MeshRecord[] = []
        const materialRecords: MaterialRecord[] = []
        const rootPosition = scene.getWorldPosition(new THREE.Vector3())
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          const part = logicalPartFor(object, team, scene)
          const worldPosition = object.getWorldPosition(new THREE.Vector3()).sub(rootPosition)
          meshRecords.push({
            mesh: object,
            part,
            baseVisible: object.visible,
            basePosition: object.position.clone(),
            explodeOffset: explodedOffsetFor(part, worldPosition),
            isAeroFlap: (part === 'rearWing' || part === 'frontWing') && /FLAP|DRS|ACTIVE/i.test(object.name),
            baseRotationX: object.rotation.x,
          })
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material]
          meshMaterials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return
            material.transparent = true
            materialRecords.push({
              material,
              baseColor: material.color.clone(),
              baseEmissive: material.emissive.clone(),
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
      if (loadedScene) disposeScene(loadedScene)
    }
  }, [team.carModel, team.meshMap])

  useFrame((_, dt) => {
    if (!model) return
    const blend = 1 - Math.exp(-dt * 6)
    for (const record of records.current) {
      record.mesh.visible = floorView ? record.part === 'floor' || record.part === 'diffuser' : record.baseVisible
      const target = exploded ? record.basePosition.clone().add(record.explodeOffset) : record.basePosition
      record.mesh.position.lerp(target, blend)
      const flapTarget = activeAero && aeroState === 'Straight' && record.isAeroFlap ? record.baseRotationX - .16 : record.baseRotationX
      record.mesh.rotation.x = THREE.MathUtils.damp(record.mesh.rotation.x, flapTarget, 6, dt)
    }

    for (const record of materials.current) {
      record.material.opacity = THREE.MathUtils.damp(record.material.opacity, xray ? .24 : record.baseOpacity, 6, dt)
      record.material.depthWrite = !xray
      const targetColor = pressure && windTunnel && windSpeed > 0 ? pressureColor : record.baseColor
      record.material.color.lerp(targetColor, blend)
      record.material.emissive.lerp(record.baseEmissive, blend)
      record.material.emissiveIntensity = THREE.MathUtils.damp(record.material.emissiveIntensity, 1, 6, dt)
    }

    if (selected) {
      for (const record of records.current) {
        if (record.part !== selected) continue
        const meshMaterials = Array.isArray(record.mesh.material) ? record.mesh.material : [record.mesh.material]
        for (const material of meshMaterials) {
          if (!(material instanceof THREE.MeshStandardMaterial)) continue
          material.emissive.lerp(highlight, blend)
          material.emissiveIntensity = 1.5
        }
      }
    }
  })

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || !model) return
    const part = logicalPartFor(event.object, team, model)
    if (!part) return
    event.stopPropagation()
    set({ selectedComponent: part })
  }

  if (!team.carModel || !model || loadFailed) return <F1Car team={team} position={position} scale={scale} interactive={interactive} />

  return (
    <group position={position} scale={scale} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}
