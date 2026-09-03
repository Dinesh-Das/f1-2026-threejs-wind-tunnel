import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Team } from '../data/teams'
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
  basePosition: THREE.Vector3
  isAeroFlap: boolean
  baseRotationX: number
}

const explodedOffsets: Record<string, THREE.Vector3> = {
  frontWing: new THREE.Vector3(0, 0, 2.2),
  nose: new THREE.Vector3(0, .25, 1.2),
  suspension: new THREE.Vector3(1.4, .2, .3),
  sidepods: new THREE.Vector3(1.8, .4, 0),
  floor: new THREE.Vector3(0, -1, 0),
  diffuser: new THREE.Vector3(0, -.4, -1.7),
  rearWing: new THREE.Vector3(0, .6, -2),
  halo: new THREE.Vector3(0, 1.2, 0),
  wheels: new THREE.Vector3(2, .2, 0),
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
        const longestPlanDimension = Math.max(initialSize.x, initialSize.z)
        if (Number.isFinite(longestPlanDimension) && longestPlanDimension > 0) {
          scene.scale.setScalar(7.6 / longestPlanDimension)
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
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return
          const part = logicalPartFor(object, team, scene)
          meshRecords.push({
            mesh: object,
            part,
            basePosition: object.position.clone(),
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
      const offset = exploded && record.part ? explodedOffsets[record.part] : null
      const target = offset ? record.basePosition.clone().add(offset) : record.basePosition
      record.mesh.position.lerp(target, blend)
      const flapTarget = activeAero && aeroState === 'Straight' && record.isAeroFlap ? record.baseRotationX - .16 : record.baseRotationX
      record.mesh.rotation.x = THREE.MathUtils.damp(record.mesh.rotation.x, flapTarget, 6, dt)
    }

    for (const record of materials.current) {
      record.material.opacity = THREE.MathUtils.damp(record.material.opacity, xray ? .24 : record.baseOpacity, 6, dt)
      record.material.depthWrite = !xray
      const targetColor = pressure ? pressureColor : record.baseColor
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

  if (!model || loadFailed) return <F1Car team={team} position={position} scale={scale} interactive={interactive} />

  return (
    <group position={position} scale={scale} rotation={[0, Math.PI, 0]} onClick={onClick}>
      <primitive object={model} />
    </group>
  )
}
