import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { Team } from '../data/teams'
import { F1_2026_REFERENCE, toSceneUnits } from '../data/f1Reference'
import { useF1Store } from '../store/useF1Store'

type Props = { team: Team; position?: [number, number, number]; scale?: number; interactive?: boolean }
type Part = 'frontWing' | 'nose' | 'suspension' | 'sidepods' | 'floor' | 'diffuser' | 'rearWing' | 'halo' | 'wheels'

const frontAxleZ = toSceneUnits(F1_2026_REFERENCE.maxWheelbaseM / 2)
const rearAxleZ = -frontAxleZ
const halfCarWidth = toSceneUnits(F1_2026_REFERENCE.maxWidthM / 2)
const frontTyreWidth = toSceneUnits(F1_2026_REFERENCE.frontTyreWidthM)
const rearTyreWidth = toSceneUnits(F1_2026_REFERENCE.rearTyreWidthM)
const frontTyreRadius = toSceneUnits(F1_2026_REFERENCE.frontTyreDiameterM / 2)
const rearTyreRadius = toSceneUnits(F1_2026_REFERENCE.rearTyreDiameterM / 2)
const frontWheelX = halfCarWidth - frontTyreWidth / 2
const rearWheelX = halfCarWidth - rearTyreWidth / 2

function Strut({ start, end, material }: { start: THREE.Vector3; end: THREE.Vector3; material: THREE.Material }) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const direction = end.clone().sub(start)
    const length = direction.length()
    const midpoint = start.clone().add(end).multiplyScalar(.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return { midpoint, quaternion, length }
  }, [start, end])
  return <mesh position={midpoint} quaternion={quaternion} material={material} castShadow><cylinderGeometry args={[.011, .011, length, 12]} /></mesh>
}

function Airfoil({
  span,
  chord,
  thickness,
  camber = 0,
  position,
  rotation = [0, 0, 0],
  material,
}: {
  span: number
  chord: number
  thickness: number
  camber?: number
  position: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-chord * .5, 0)
    shape.quadraticCurveTo(-chord * .08, thickness * .72 + camber, chord * .5, thickness * .06)
    shape.quadraticCurveTo(chord * .06, -thickness * .34 + camber * .18, -chord * .5, 0)
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: span,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: Math.min(.009, thickness * .18),
      bevelThickness: Math.min(.008, thickness * .16),
      curveSegments: 18,
      steps: 1,
    })
    result.rotateY(Math.PI / 2)
    result.translate(-span / 2, 0, 0)
    result.computeVertexNormals()
    return result
  }, [span, chord, thickness, camber])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} position={position} rotation={rotation} castShadow receiveShadow />
}

type LoftStation = {
  z: number
  width: number
  y: number
  height: number
}

function LoftBody({
  stations,
  material,
  position = [0, 0, 0],
  radialSegments = 32,
}: {
  stations: LoftStation[]
  material: THREE.Material
  position?: [number, number, number]
  radialSegments?: number
}) {
  const geometry = useMemo(() => {
    const vertices: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    stations.forEach((station, stationIndex) => {
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const angle = (segment / radialSegments) * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const shapedSin = Math.sign(sin) * Math.pow(Math.abs(sin), .84)
        vertices.push(
          cos * station.width * .5,
          station.y + shapedSin * station.height * .5,
          station.z,
        )
        uvs.push(segment / radialSegments, stationIndex / Math.max(1, stations.length - 1))
      }
    })

    for (let station = 0; station < stations.length - 1; station += 1) {
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const nextSegment = (segment + 1) % radialSegments
        const a = station * radialSegments + segment
        const b = station * radialSegments + nextSegment
        const c = (station + 1) * radialSegments + nextSegment
        const d = (station + 1) * radialSegments + segment
        indices.push(a, b, d, b, c, d)
      }
    }

    const addCap = (stationIndex: number, reverse: boolean) => {
      const centerIndex = vertices.length / 3
      const station = stations[stationIndex]
      vertices.push(0, station.y, station.z)
      uvs.push(.5, stationIndex === 0 ? 0 : 1)
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const nextSegment = (segment + 1) % radialSegments
        const a = stationIndex * radialSegments + segment
        const b = stationIndex * radialSegments + nextSegment
        if (reverse) indices.push(centerIndex, b, a)
        else indices.push(centerIndex, a, b)
      }
    }

    addCap(0, true)
    addCap(stations.length - 1, false)

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingSphere()
    return result
  }, [radialSegments, stations])

  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} position={position} castShadow receiveShadow />
}

function PlanformPlate({
  points,
  thickness,
  y,
  material,
}: {
  points: [number, number][]
  thickness: number
  y: number
  material: THREE.Material
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    points.slice(1).forEach(([x, z]) => shape.lineTo(x, z))
    shape.closePath()
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: Math.min(.018, thickness * .18),
      bevelThickness: Math.min(.012, thickness * .14),
      curveSegments: 1,
      steps: 1,
    })
    result.rotateX(Math.PI / 2)
    result.translate(0, y + thickness / 2, 0)
    result.computeVertexNormals()
    return result
  }, [points, thickness, y])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}

function VerticalPlate({
  points,
  thickness,
  material,
}: {
  points: [number, number][]
  thickness: number
  material: THREE.Material
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(points[0][0], points[0][1])
    points.slice(1).forEach(([z, y]) => shape.lineTo(z, y))
    shape.closePath()
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: Math.min(.008, thickness * .2),
      bevelThickness: Math.min(.006, thickness * .16),
      curveSegments: 1,
      steps: 1,
    })
    result.rotateY(-Math.PI / 2)
    result.translate(thickness / 2, 0, 0)
    result.computeVertexNormals()
    return result
  }, [points, thickness])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}

function tyreMarkTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '900 62px Arial Narrow, Arial, sans-serif'
    context.fillStyle = '#f4d600'
    context.fillText('P ZERO', 256, 64)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function Wheel({ x, z, width, radius, tire, rim, brake, cover }: { x: number; z: number; width: number; radius: number; tire: THREE.Material; rim: THREE.Material; brake: THREE.Material; cover: THREE.Material }) {
  const aerodynamicMode = useF1Store((s) => s.aerodynamicMode)
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const spin = useRef<THREE.Group>(null)
  const tyreMark = useMemo(() => tyreMarkTexture(), [])
  useEffect(() => () => tyreMark.dispose(), [tyreMark])
  const tyreProfile = useMemo(() => {
    const half = width / 2
    const shoulder = radius * .075
    return [
      new THREE.Vector2(radius - shoulder, -half),
      new THREE.Vector2(radius, -half + shoulder),
      new THREE.Vector2(radius, half - shoulder),
      new THREE.Vector2(radius - shoulder, half),
      new THREE.Vector2(radius * .72, half),
      new THREE.Vector2(radius * .67, half - shoulder),
      new THREE.Vector2(radius * .67, -half + shoulder),
      new THREE.Vector2(radius * .72, -half),
    ]
  }, [width, radius])
  useFrame((_, dt) => {
    if (!spin.current || !aerodynamicMode || !windTunnel || windSpeed <= 0) return
    const speedSceneUnits = (windSpeed / 3.6) * F1_2026_REFERENCE.sceneUnitsPerMetre
    const angularVelocity = speedSceneUnits / radius
    // The outer +90deg Z rotation maps local -Y to the wheel's world +X axle.
    spin.current.rotation.y = (spin.current.rotation.y - angularVelocity * dt) % (Math.PI * 2)
  })
  const roadY = -.58
  const outerFaceSign = x >= 0 ? -1 : 1
  const outerFaceY = outerFaceSign * width * .414
  const faceRotationX = outerFaceSign > 0 ? Math.PI / 2 : -Math.PI / 2
  return <group position={[x, roadY + radius, z]} rotation={[0, 0, Math.PI / 2]}>
    <group ref={spin}>
      <mesh material={tire} castShadow receiveShadow><latheGeometry args={[tyreProfile, 48]} /></mesh>
      <mesh material={rim} castShadow><cylinderGeometry args={[.355, .355, width * .72, 64, 1, true]} /></mesh>
      <mesh material={brake}><cylinderGeometry args={[.285, .285, width * .68, 56, 1, true]} /></mesh>
      <mesh position={[0, outerFaceSign * width * .392, 0]} rotation={[faceRotationX, 0, 0]} material={rim} castShadow>
        <ringGeometry args={[.18, .355, 64]} />
      </mesh>
      <mesh position={[0, outerFaceSign * width * .398, 0]} rotation={[faceRotationX, 0, 0]} material={brake}>
        <ringGeometry args={[.19, .275, 56]} />
      </mesh>
      <mesh position={[0, outerFaceY, 0]} rotation={[faceRotationX, 0, 0]} material={cover} castShadow>
        <circleGeometry args={[.338, 72]} />
      </mesh>
      <mesh position={[0, outerFaceY + outerFaceSign * .004, 0]} rotation={[faceRotationX, 0, 0]} material={rim}>
        <torusGeometry args={[.284, .007, 8, 64]} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2 + .14
        return <mesh key={index} position={[Math.cos(angle) * .225, outerFaceY + outerFaceSign * .006, Math.sin(angle) * .225]} rotation={[faceRotationX, 0, -angle + .55]} material={rim}>
          <planeGeometry args={[.085, .012]} />
        </mesh>
      })}
      <mesh position={[0, outerFaceSign * width * .428, 0]} rotation={[faceRotationX, 0, 0]} material={rim} castShadow><circleGeometry args={[.085, 40]} /></mesh>
      <mesh position={[0, outerFaceSign * width * .438, 0]} rotation={[faceRotationX, 0, 0]} material={brake}><circleGeometry args={[.035, 32]} /></mesh>
      <mesh position={[.245, outerFaceSign * width * .405, -.02]} rotation={[0, 0, .12]} material={brake} castShadow><boxGeometry args={[.085, .04, .18]} /></mesh>
      <mesh position={[0, outerFaceSign * width * .404, 0]} rotation={[faceRotationX, 0, 0]} material={rim}><torusGeometry args={[.355, .018, 10, 64]} /></mesh>
      <mesh position={[0, outerFaceSign * width * .45, radius * .76]} rotation={[faceRotationX, 0, 0]}>
        <planeGeometry args={[.5, .105]} />
        <meshBasicMaterial map={tyreMark} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, outerFaceSign * width * .451, -radius * .76]} rotation={[faceRotationX, 0, Math.PI]}>
        <planeGeometry args={[.5, .105]} />
        <meshBasicMaterial map={tyreMark} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  </group>
}

function driverNumberTexture(number: number, foreground: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.font = '900 196px Arial, sans-serif'
    context.lineWidth = 22
    context.strokeStyle = '#080a0c'
    context.strokeText(String(number), canvas.width / 2, canvas.height / 2 + 8)
    context.fillStyle = foreground
    context.fillText(String(number), canvas.width / 2, canvas.height / 2 + 8)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function liveryMaterial(team: Team, color: string) {
  const metallic = team.livery.finish === 'metallic' ? .38 : team.livery.finish === 'satin' ? .08 : .18
  const roughness = team.livery.finish === 'satin' ? .34 : team.livery.finish === 'metallic' ? .2 : .18
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: metallic,
    roughness,
    clearcoat: team.livery.finish === 'satin' ? .58 : .92,
    clearcoatRoughness: team.livery.finish === 'satin' ? .24 : .1,
    transparent: true,
  })
}

export function F1Car({ team, position = [0, 0, 0], scale = 1, interactive = true }: Props) {
  const exploded = useF1Store((s) => s.exploded)
  const xray = useF1Store((s) => s.xray)
  const pressure = useF1Store((s) => s.pressureMap)
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const floorView = useF1Store((s) => s.floorView)
  const activeAero = useF1Store((s) => s.activeAero)
  const aeroState = useF1Store((s) => s.activeAeroState)
  const selected = useF1Store((s) => s.selectedComponent)
  const selectedDriverId = useF1Store((s) => s.selectedDriverId)
  const set = useF1Store((s) => s.set)
  const rearFlaps = useRef<THREE.Group>(null)
  const frontFlaps = useRef<THREE.Group>(null)
  const logo = useTexture(team.logo)
  logo.colorSpace = THREE.SRGBColorSpace
  const driver = team.drivers.find((candidate) => candidate.id === selectedDriverId) ?? team.drivers[0]
  const numberTexture = useMemo(() => driverNumberTexture(driver.number, team.livery.accent2), [driver.number, team.livery.accent2])
  useEffect(() => () => numberTexture.dispose(), [numberTexture])

  const paint = useMemo(() => liveryMaterial(team, team.livery.body), [team])
  const sidepodPaint = useMemo(() => liveryMaterial(team, team.livery.sidepod), [team])
  const engineCoverPaint = useMemo(() => liveryMaterial(team, team.livery.engineCover), [team])
  const wingPaint = useMemo(() => liveryMaterial(team, team.livery.wing), [team])
  const accentPaint = useMemo(() => liveryMaterial(team, team.livery.accent), [team])
  const accent2Paint = useMemo(() => liveryMaterial(team, team.livery.accent2), [team])
  const haloPaint = useMemo(() => liveryMaterial(team, team.livery.halo), [team])
  const carbon = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#111315', metalness: .03, roughness: .31, clearcoat: .32, clearcoatRoughness: .2, transparent: true }), [])
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#18191a', roughness: .9, metalness: 0 }), [])
  const rim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#50575c', roughness: .28, metalness: .86 }), [])
  const brake = useMemo(() => new THREE.MeshStandardMaterial({ color: '#343a3e', roughness: .48, metalness: .72 }), [])
  const visor = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#071014', roughness: .08, metalness: .35, clearcoat: 1, clearcoatRoughness: .04 }), [])
  const helmet = useMemo(() => liveryMaterial(team, team.livery.accent2), [team])
  const liveryPaints = useMemo(() => [
    [paint, new THREE.Color(team.livery.body)],
    [sidepodPaint, new THREE.Color(team.livery.sidepod)],
    [engineCoverPaint, new THREE.Color(team.livery.engineCover)],
    [wingPaint, new THREE.Color(team.livery.wing)],
    [accentPaint, new THREE.Color(team.livery.accent)],
    [accent2Paint, new THREE.Color(team.livery.accent2)],
    [haloPaint, new THREE.Color(team.livery.halo)],
  ] as const, [paint, sidepodPaint, engineCoverPaint, wingPaint, accentPaint, accent2Paint, haloPaint, team])
  const pressurePaint = useMemo(() => new THREE.Color('#e95a2b'), [])
  const chassisStations = useMemo<LoftStation[]>(() => [
    { z: 2.18, width: .58, y: -.05, height: .42 },
    { z: 1.35, width: .72, y: .01, height: .5 },
    { z: .55, width: .82, y: .07, height: .59 },
    { z: -.35, width: .86, y: .08, height: .62 },
    { z: -1.25, width: .76, y: .08, height: .56 },
    { z: -2.15, width: .62, y: .03, height: .46 },
    { z: -3.05, width: .42, y: -.06, height: .3 },
  ], [])
  const engineCoverStations = useMemo<LoftStation[]>(() => [
    { z: -.05, width: .5, y: .31, height: .32 },
    { z: -.72, width: .52, y: .39, height: .62 },
    { z: -1.35, width: .46, y: .43, height: .86 },
    { z: -2.05, width: .36, y: .34, height: .7 },
    { z: -2.72, width: .24, y: .22, height: .48 },
    { z: -3.16, width: .16, y: .08, height: .3 },
  ], [])
  const noseStations = useMemo<LoftStation[]>(() => [
    { z: 4.22, width: .18, y: -.13, height: .16 },
    { z: 3.78, width: .24, y: -.1, height: .19 },
    { z: 3.18, width: .34, y: -.055, height: .25 },
    { z: 2.6, width: .44, y: -.005, height: .31 },
    { z: 2.08, width: .58, y: .035, height: .39 },
    { z: 1.72, width: .66, y: .045, height: .43 },
  ], [])
  const sidepodStations = useMemo<LoftStation[]>(() => [
    { z: .84, width: .54, y: .07, height: .38 },
    { z: .55, width: .7, y: .035, height: .5 },
    { z: .08, width: .82, y: -.005, height: .58 },
    { z: -.55, width: .84, y: -.04, height: .55 },
    { z: -1.25, width: .68, y: -.08, height: .46 },
    { z: -1.92, width: .48, y: -.12, height: .34 },
    { z: -2.45, width: .25, y: -.15, height: .22 },
  ], [])
  const sidepodUndercutStations = useMemo<LoftStation[]>(() => [
    { z: .48, width: .34, y: -.21, height: .16 },
    { z: -.1, width: .4, y: -.24, height: .2 },
    { z: -.82, width: .34, y: -.27, height: .18 },
    { z: -1.55, width: .22, y: -.29, height: .13 },
    { z: -2.05, width: .12, y: -.3, height: .08 },
  ], [])
  const floorOutline = useMemo<[number, number][]>(() => [
    [-.56, 3.2], [.56, 3.2], [1.16, 2.42], [1.34, 1.62], [1.36, -2.34],
    [1.08, -3.38], [-1.08, -3.38], [-1.36, -2.34], [-1.34, 1.62], [-1.16, 2.42],
  ], [])
  const sharkFin = useMemo<[number, number][]>(() => [
    [-.5, .72], [-1.05, 1.16], [-1.72, 1.11], [-2.5, .87], [-2.95, .52], [-2.05, .43], [-.82, .48],
  ], [])

  useFrame((_, dt) => {
    const opacity = xray ? .2 : 1
    for (const [material, baseColor] of liveryPaints) {
      material.opacity = THREE.MathUtils.damp(material.opacity, opacity, 5, dt)
      material.depthWrite = !xray
      material.color.lerp(pressure && windTunnel && windSpeed > 0 ? pressurePaint : baseColor, 1 - Math.exp(-dt * 3))
    }
    carbon.opacity = THREE.MathUtils.damp(carbon.opacity, xray ? .42 : 1, 5, dt)
    carbon.depthWrite = !xray
    const open = activeAero && aeroState === 'Straight'
    if (rearFlaps.current) rearFlaps.current.rotation.x = THREE.MathUtils.damp(rearFlaps.current.rotation.x, open ? -.13 : 0, 5, dt)
    if (frontFlaps.current) frontFlaps.current.rotation.x = THREE.MathUtils.damp(frontFlaps.current.rotation.x, open ? -.085 : 0, 5, dt)
  })

  const click = (part: Part) => (event: { stopPropagation: () => void }) => {
    if (!interactive) return
    event.stopPropagation()
    set({ selectedComponent: part })
  }
  const lateralExplode = (x: number, amount = 1.1) => exploded ? Math.sign(x || 1) * amount : 0
  const axialExplode = (z: number, amount = 1.35) => exploded ? Math.sign(z || 1) * amount : 0

  const frontHubY = -.58 + frontTyreRadius
  const rearHubY = -.58 + rearTyreRadius
  const frontHubR = new THREE.Vector3(frontWheelX, frontHubY, frontAxleZ)
  const frontHubL = new THREE.Vector3(-frontWheelX, frontHubY, frontAxleZ)
  const rearHubR = new THREE.Vector3(rearWheelX, rearHubY, rearAxleZ)
  const rearHubL = new THREE.Vector3(-rearWheelX, rearHubY, rearAxleZ)

  return (
    <group position={position} scale={scale}>
      <group onClick={click('floor')} position={[0, exploded ? -.65 : 0, 0]}>
        <PlanformPlate points={floorOutline} thickness={.075} y={-.5} material={carbon} />
        <mesh position={[0, -.46, -3.25]} rotation={[.16, 0, 0]} material={carbon}><boxGeometry args={[2.45, .16, 1.15]} /></mesh>
        <RoundedBox args={[.07, .15, 4.65]} radius={.025} smoothness={4} position={[1.32, -.43, -.08]} material={carbon} />
        <RoundedBox args={[.07, .15, 4.65]} radius={.025} smoothness={4} position={[-1.32, -.43, -.08]} material={carbon} />
        {[-.78, -.42, .42, .78].map((x) => <mesh key={x} position={[x, -.38, 1.7]} rotation={[0, 0, x * -.055]} material={carbon}><boxGeometry args={[.035, .34, 1.55]} /></mesh>)}
        <mesh position={[0, -.548, -.2]} material={carbon}><boxGeometry args={[.28, .018, 5.45]} /></mesh>
      </group>

      <group visible={!floorView}>
      <group>
        <LoftBody stations={chassisStations} material={paint} radialSegments={40} />
        <LoftBody stations={engineCoverStations} material={engineCoverPaint} radialSegments={40} />
        <mesh position={[0, .37, .42]} rotation={[Math.PI / 2, 0, 0]} scale={[.9, .38, 1.22]} castShadow material={carbon}><capsuleGeometry args={[.31, .62, 12, 32]} /></mesh>
        <mesh position={[0, .46, .52]} scale={[.78, .27, 1.12]} material={carbon}><sphereGeometry args={[.31, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0, .66, .43]} scale={[.75, .8, .88]} castShadow material={helmet}><sphereGeometry args={[.225, 32, 20]} /></mesh>
        <mesh position={[0, .68, .615]} scale={[1, .61, 1]} material={visor}><sphereGeometry args={[.188, 30, 16, 0, Math.PI * 2, .22, 1.05]} /></mesh>
        <RoundedBox args={[.34, .065, .08]} radius={.025} smoothness={5} position={[0, .51, .76]} rotation={[.22, 0, 0]} material={carbon} />
        <mesh position={[0, .515, .815]} rotation={[Math.PI / 2, 0, 0]} material={rim}><torusGeometry args={[.16, .025, 10, 30]} /></mesh>
        <mesh position={[0, .81, -.49]} scale={[1, 1.12, 1]} material={carbon} castShadow><torusGeometry args={[.17, .043, 14, 40]} /></mesh>
        <mesh position={[0, .81, -.495]} scale={[1, 1.12, 1]} material={visor}><circleGeometry args={[.128, 40]} /></mesh>
        <VerticalPlate points={sharkFin} thickness={.028} material={engineCoverPaint} />
        <mesh position={[0, .18, -3.09]} rotation={[Math.PI / 2, 0, 0]} material={rim} castShadow><cylinderGeometry args={[.078, .09, .28, 28]} /></mesh>
        <RoundedBox args={[.055, .018, 1.72]} radius={.008} smoothness={4} position={[0, .64, -1.1]} rotation={[.025, 0, 0]} material={accentPaint} />
        {[1, -1].map((side) => <group key={`mirror-${side}`}>
          <Strut start={new THREE.Vector3(side * .48, .48, .58)} end={new THREE.Vector3(side * .92, .62, .62)} material={carbon} />
          <RoundedBox args={[.28, .105, .17]} radius={.048} smoothness={6} position={[side * .99, .63, .64]} rotation={[0, side * .14, 0]} material={paint} castShadow />
          <RoundedBox args={[.012, .075, .12]} radius={.005} smoothness={3} position={[side * 1.137, .63, .65]} rotation={[0, side * .14, 0]} material={carbon} />
        </group>)}
      </group>

      <group onClick={click('nose')} position={[0, 0, axialExplode(1, 1.1)]}>
        <LoftBody stations={noseStations} material={paint} radialSegments={36} />
        <RoundedBox args={[.44, .055, .62]} radius={.035} smoothness={5} position={[0, -.18, 4.08]} material={carbon} />
        <RoundedBox args={[.042, .19, .54]} radius={.018} smoothness={4} position={[.16, -.245, 4.39]} rotation={[-.13, 0, 0]} material={carbon} />
        <RoundedBox args={[.042, .19, .54]} radius={.018} smoothness={4} position={[-.16, -.245, 4.39]} rotation={[-.13, 0, 0]} material={carbon} />
        <RoundedBox args={[.075, .016, 1.86]} radius={.008} smoothness={4} position={[0, .205, 3.08]} material={accentPaint} />
        <mesh position={[0, .25, 3.35]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[.48, .2]} />
          <meshBasicMaterial map={logo} transparent alphaTest={.08} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, .268, 2.75]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[.42, .25]} />
          <meshBasicMaterial map={numberTexture} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {[1, -1].map((side) => <group key={side} onClick={click('sidepods')} position={[lateralExplode(side), 0, 0]}>
        <LoftBody stations={sidepodStations} material={sidepodPaint} position={[side * .93, 0, 0]} radialSegments={34} />
        <LoftBody stations={sidepodUndercutStations} material={carbon} position={[side * .76, 0, 0]} radialSegments={28} />
        <mesh position={[side * .93, .105, .861]} scale={[1.08, .5, 1]} material={carbon} castShadow>
          <ringGeometry args={[.19, .31, 56]} />
        </mesh>
        <mesh position={[side * .93, .105, .855]} scale={[1.08, .5, 1]} material={visor}>
          <circleGeometry args={[.19, 56]} />
        </mesh>
        <Airfoil span={.68} chord={.23} thickness={.022} camber={.012} position={[side * .93, .255, .72]} rotation={[-.08, 0, side * -.03]} material={accentPaint} />
        <RoundedBox args={[.115, .17, 1.62]} radius={.045} smoothness={5} position={[side * 1.19, -.22, -.48]} rotation={[0, 0, side * -.055]} material={carbon} />
        <RoundedBox args={[.045, .38, .6]} radius={.025} smoothness={4} position={[side * 1.34, -.1, 1.5]} rotation={[0, side * .08, side * -.12]} material={carbon} />
        <mesh position={[side * 1.37, .08, -.76]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[1.18, .34]} />
          <meshBasicMaterial map={logo} transparent alphaTest={.08} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[side * .69, .48, -1.47]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[.62, .42]} />
          <meshBasicMaterial map={numberTexture} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>)}

      <group onClick={click('frontWing')} position={[0, 0, axialExplode(1)]}>
        <Airfoil span={3.62} chord={.58} thickness={.052} camber={.018} position={[0,-.32,4.72]} rotation={[-.025,0,0]} material={wingPaint} />
        <group ref={frontFlaps} position={[0, -.16, 4.48]}>
          <Airfoil span={3.5} chord={.43} thickness={.042} camber={.025} position={[0,0,0]} rotation={[-.08,0,0]} material={wingPaint} />
          <Airfoil span={3.34} chord={.36} thickness={.035} camber={.03} position={[0,.13,-.29]} rotation={[-.12,0,0]} material={accent2Paint} />
        </group>
        <RoundedBox args={[.018, .42, .58]} radius={.012} smoothness={4} position={[1.81, -.14, 4.54]} rotation={[0, .035, -.025]} material={carbon} />
        <RoundedBox args={[.018, .42, .58]} radius={.012} smoothness={4} position={[-1.81, -.14, 4.54]} rotation={[0, -.035, .025]} material={carbon} />
        <Airfoil span={.28} chord={.52} thickness={.024} camber={.012} position={[1.68, -.04, 4.34]} rotation={[-.03, .1, -.07]} material={carbon} />
        <Airfoil span={.28} chord={.52} thickness={.024} camber={.012} position={[-1.68, -.04, 4.34]} rotation={[-.03, -.1, .07]} material={carbon} />
      </group>

      <group onClick={click('rearWing')} position={[0, 0, axialExplode(-1)]}>
        <Airfoil span={2.28} chord={.36} thickness={.045} camber={.018} position={[0,.24,-3.76]} rotation={[.06,0,0]} material={wingPaint} />
        <Airfoil span={2.72} chord={.46} thickness={.05} camber={.035} position={[0,.78,-4.15]} rotation={[.09,0,0]} material={wingPaint} />
        <group ref={rearFlaps} position={[0, 1.0, -4.08]}>
          <Airfoil span={2.62} chord={.43} thickness={.042} camber={.04} position={[0,0,0]} rotation={[.1,0,0]} material={wingPaint} />
          <Airfoil span={2.52} chord={.36} thickness={.036} camber={.045} position={[0,.2,-.08]} rotation={[.14,0,0]} material={accent2Paint} />
        </group>
        <RoundedBox args={[.018, 1.06, .46]} radius={.012} smoothness={4} position={[1.35, .67, -4.07]} rotation={[.01, .02, -.025]} material={carbon} />
        <RoundedBox args={[.018, 1.06, .46]} radius={.012} smoothness={4} position={[-1.35, .67, -4.07]} rotation={[.01, -.02, .025]} material={carbon} />
        <RoundedBox args={[.13, .88, .11]} radius={.025} smoothness={4} position={[0, .28, -3.83]} material={carbon} />
      </group>

      <group onClick={click('diffuser')} position={[0, exploded ? -.25 : 0, axialExplode(-1, .9)]}>
        <mesh position={[0, -.39, -3.75]} rotation={[.24, 0, 0]} material={carbon}><boxGeometry args={[2.3, .1, 1.18]} /></mesh>
        {[-.82, -.42, 0, .42, .82].map((x) => <mesh key={x} position={[x, -.29, -3.85]} rotation={[.24, 0, 0]} material={carbon}><boxGeometry args={[.025, .3, 1.0]} /></mesh>)}
      </group>

      <group onClick={click('halo')} position={[0, exploded ? .85 : 0, 0]}>
        <mesh position={[0, .79, .49]} rotation={[Math.PI / 2, 0, 0]} scale={[1, .72, 1]} material={haloPaint} castShadow><torusGeometry args={[.35, .035, 14, 64]} /></mesh>
        <Strut start={new THREE.Vector3(0, .8, .78)} end={new THREE.Vector3(0, .49, .69)} material={haloPaint} />
        <Strut start={new THREE.Vector3(.31, .76, .31)} end={new THREE.Vector3(.39, .46, .13)} material={haloPaint} />
        <Strut start={new THREE.Vector3(-.31, .76, .31)} end={new THREE.Vector3(-.39, .46, .13)} material={haloPaint} />
      </group>

      <group onClick={click('suspension')}>
        <Strut start={new THREE.Vector3(.42, -.05, 2.82)} end={frontHubR.clone().add(new THREE.Vector3(-.025, -.16, .06))} material={carbon} />
        <Strut start={new THREE.Vector3(.42, .32, 3.05)} end={frontHubR.clone().add(new THREE.Vector3(-.025, .17, -.04))} material={carbon} />
        <Strut start={new THREE.Vector3(.2, .44, 2.58)} end={frontHubR.clone().add(new THREE.Vector3(-.04, .08, .08))} material={carbon} />
        <Strut start={new THREE.Vector3(-.42, -.05, 2.82)} end={frontHubL.clone().add(new THREE.Vector3(.025, -.16, .06))} material={carbon} />
        <Strut start={new THREE.Vector3(-.42, .32, 3.05)} end={frontHubL.clone().add(new THREE.Vector3(.025, .17, -.04))} material={carbon} />
        <Strut start={new THREE.Vector3(-.2, .44, 2.58)} end={frontHubL.clone().add(new THREE.Vector3(.04, .08, .08))} material={carbon} />
        <Strut start={new THREE.Vector3(.62, -.08, -2.72)} end={rearHubR.clone().add(new THREE.Vector3(-.03, -.17, -.05))} material={carbon} />
        <Strut start={new THREE.Vector3(.62, .26, -2.93)} end={rearHubR.clone().add(new THREE.Vector3(-.03, .17, .05))} material={carbon} />
        <Strut start={new THREE.Vector3(.35, .39, -2.52)} end={rearHubR.clone().add(new THREE.Vector3(-.05, .08, -.08))} material={carbon} />
        <Strut start={new THREE.Vector3(-.62, -.08, -2.72)} end={rearHubL.clone().add(new THREE.Vector3(.03, -.17, -.05))} material={carbon} />
        <Strut start={new THREE.Vector3(-.62, .26, -2.93)} end={rearHubL.clone().add(new THREE.Vector3(.03, .17, .05))} material={carbon} />
        <Strut start={new THREE.Vector3(-.35, .39, -2.52)} end={rearHubL.clone().add(new THREE.Vector3(.05, .08, -.08))} material={carbon} />
      </group>

      <group onClick={click('wheels')}>
        <group position={[lateralExplode(frontWheelX, .9), 0, axialExplode(frontAxleZ, .45)]}><Wheel x={frontWheelX} z={frontAxleZ} width={frontTyreWidth} radius={frontTyreRadius} tire={tire} rim={rim} brake={brake} cover={carbon} /></group>
        <group position={[lateralExplode(-frontWheelX, .9), 0, axialExplode(frontAxleZ, .45)]}><Wheel x={-frontWheelX} z={frontAxleZ} width={frontTyreWidth} radius={frontTyreRadius} tire={tire} rim={rim} brake={brake} cover={carbon} /></group>
        <group position={[lateralExplode(rearWheelX, .9), 0, axialExplode(rearAxleZ, .45)]}><Wheel x={rearWheelX} z={rearAxleZ} width={rearTyreWidth} radius={rearTyreRadius} tire={tire} rim={rim} brake={brake} cover={carbon} /></group>
        <group position={[lateralExplode(-rearWheelX, .9), 0, axialExplode(rearAxleZ, .45)]}><Wheel x={-rearWheelX} z={rearAxleZ} width={rearTyreWidth} radius={rearTyreRadius} tire={tire} rim={rim} brake={brake} cover={carbon} /></group>
      </group>
      </group>

      {selected && <pointLight position={[0, 1.5, 0]} color={team.secondaryColor} intensity={1.25} distance={5} />}
    </group>
  )
}
