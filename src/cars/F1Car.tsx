import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
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
  return <mesh position={midpoint} quaternion={quaternion} material={material} castShadow><cylinderGeometry args={[.025, .025, length, 10]} /></mesh>
}

function Wheel({ x, z, width, radius, tire, rim, brake }: { x: number; z: number; width: number; radius: number; tire: THREE.Material; rim: THREE.Material; brake: THREE.Material }) {
  const aerodynamicMode = useF1Store((s) => s.aerodynamicMode)
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const spin = useRef<THREE.Group>(null)
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
  return <group position={[x, roadY + radius, z]} rotation={[0, 0, Math.PI / 2]}>
    <group ref={spin}>
      <mesh material={tire} castShadow receiveShadow><latheGeometry args={[tyreProfile, 48]} /></mesh>
      <mesh material={rim} castShadow><cylinderGeometry args={[.42, .42, width * .78, 36]} /></mesh>
      <mesh material={brake}><cylinderGeometry args={[.31, .31, width * .8, 40]} /></mesh>
      <mesh position={[0, width * .405, 0]} material={rim} castShadow><cylinderGeometry args={[.355, .355, .028, 48]} /></mesh>
      <mesh position={[0, width * .425, 0]} material={brake}><torusGeometry args={[.245, .018, 10, 44]} /></mesh>
      <mesh position={[0, width * .22, .29]} material={rim}><boxGeometry args={[.08, .08, .22]} /></mesh>
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

  const paint = useMemo(() => liveryMaterial(team, team.livery.body), [team])
  const sidepodPaint = useMemo(() => liveryMaterial(team, team.livery.sidepod), [team])
  const engineCoverPaint = useMemo(() => liveryMaterial(team, team.livery.engineCover), [team])
  const wingPaint = useMemo(() => liveryMaterial(team, team.livery.wing), [team])
  const accentPaint = useMemo(() => liveryMaterial(team, team.livery.accent), [team])
  const accent2Paint = useMemo(() => liveryMaterial(team, team.livery.accent2), [team])
  const haloPaint = useMemo(() => liveryMaterial(team, team.livery.halo), [team])
  const carbon = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#111315', metalness: .03, roughness: .31, clearcoat: .32, clearcoatRoughness: .2, transparent: true }), [])
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111111', roughness: .94, metalness: 0 }), [])
  const rim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#24292c', roughness: .2, metalness: .92 }), [])
  const brake = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4b5358', roughness: .48, metalness: .72 }), [])
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
        <mesh position={[0, -.5, -.25]} castShadow receiveShadow material={carbon}><boxGeometry args={[2.65, .075, 6.7]} /></mesh>
        <mesh position={[0, -.46, -3.25]} rotation={[.16, 0, 0]} material={carbon}><boxGeometry args={[2.45, .16, 1.15]} /></mesh>
        <mesh position={[1.35, -.45, .15]} material={carbon}><boxGeometry args={[.1, .18, 4.9]} /></mesh>
        <mesh position={[-1.35, -.45, .15]} material={carbon}><boxGeometry args={[.1, .18, 4.9]} /></mesh>
        {[-.78, -.42, .42, .78].map((x) => <mesh key={x} position={[x, -.38, 1.7]} rotation={[0, 0, x * -.055]} material={carbon}><boxGeometry args={[.035, .34, 1.55]} /></mesh>)}
        <mesh position={[0, -.555, -.15]} material={accent2Paint}><boxGeometry args={[.34, .018, 5.5]} /></mesh>
      </group>

      <group visible={!floorView}>
      <group>
        <mesh position={[0, .05, -.05]} rotation={[Math.PI / 2, 0, 0]} scale={[1, .82, 1]} castShadow material={paint}><capsuleGeometry args={[.53, 4.55, 12, 32]} /></mesh>
        <mesh position={[0, .24, -1.58]} rotation={[Math.PI / 2, 0, 0]} scale={[.83, .64, 1]} castShadow material={engineCoverPaint}><capsuleGeometry args={[.55, 2.3, 10, 28]} /></mesh>
        <mesh position={[0, .44, -1.55]} rotation={[Math.PI / 2, 0, 0]} castShadow material={engineCoverPaint}><coneGeometry args={[.63, 2.25, 32]} /></mesh>
        <mesh position={[0, .43, .4]} rotation={[Math.PI / 2, 0, 0]} scale={[1.16, .48, 1]} castShadow material={carbon}><capsuleGeometry args={[.38, .82, 10, 28]} /></mesh>
        <mesh position={[0, .51, .55]} scale={[1, .35, 1.55]} material={carbon}><sphereGeometry args={[.35, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0, .76, -.62]} material={carbon} castShadow><cylinderGeometry args={[.27, .34, .5, 28]} /></mesh>
        <mesh position={[0, .84, -.34]} material={carbon}><circleGeometry args={[.205, 32]} /></mesh>
        <mesh position={[0, .84, -.335]} material={accentPaint}><torusGeometry args={[.225, .035, 10, 32]} /></mesh>
        <mesh position={[0, .615, -.82]} material={accentPaint}><boxGeometry args={[.12, .025, 2.45]} /></mesh>
        {[1, -1].map((side) => <group key={`mirror-${side}`}>
          <Strut start={new THREE.Vector3(side * .48, .48, .58)} end={new THREE.Vector3(side * .92, .62, .62)} material={carbon} />
          <mesh position={[side * .99, .63, .64]} rotation={[0, side * .14, 0]} material={paint}><boxGeometry args={[.3, .12, .18]} /></mesh>
          <mesh position={[side * 1.145, .63, .65]} rotation={[0, side * .14, 0]} material={carbon}><boxGeometry args={[.012, .09, .135]} /></mesh>
        </group>)}
      </group>

      <group onClick={click('nose')} position={[0, 0, axialExplode(1, 1.1)]}>
        <mesh position={[0, -.02, 2.9]} rotation={[Math.PI / 2, 0, 0]} scale={[.68, .55, 1]} castShadow material={paint}><coneGeometry args={[.43, 3.25, 28]} /></mesh>
        <mesh position={[0, -.18, 4.1]} material={carbon}><boxGeometry args={[.48, .07, .7]} /></mesh>
        <mesh position={[0, .205, 3.1]} material={accentPaint}><boxGeometry args={[.105, .025, 2.15]} /></mesh>
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
        <mesh position={[side * 1.04, -.04, -.72]} rotation={[Math.PI / 2, 0, 0]} scale={[.95, .7, 1]} castShadow material={sidepodPaint}><capsuleGeometry args={[.46, 2.55, 10, 24]} /></mesh>
        <mesh position={[side * 1.04, .11, .58]} material={carbon}><boxGeometry args={[.72, .29, .11]} /></mesh>
        <mesh position={[side * 1.04, .29, .5]} rotation={[.08, 0, 0]} material={accentPaint}><boxGeometry args={[.74, .035, .28]} /></mesh>
        <mesh position={[side * 1.22, -.22, -.18]} rotation={[0, 0, side * -.08]} material={carbon}><boxGeometry args={[.22, .34, 1.55]} /></mesh>
        <mesh position={[side * 1.42, -.05, 1.55]} rotation={[0, side * .08, side * -.12]} material={carbon}><boxGeometry args={[.1, .64, .8]} /></mesh>
        <mesh position={[side * 1.492, .08, -.72]} material={accentPaint}><boxGeometry args={[.025, .09, 2.05]} /></mesh>
        <mesh position={[side * 1.505, .1, -.74]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[1.18, .34]} />
          <meshBasicMaterial map={logo} transparent alphaTest={.08} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[side * .69, .48, -1.47]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[.62, .42]} />
          <meshBasicMaterial map={numberTexture} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>)}

      <group onClick={click('frontWing')} position={[0, 0, axialExplode(1)]}>
        <mesh position={[0, -.32, 4.72]} rotation={[-.035, 0, 0]} castShadow material={wingPaint}><boxGeometry args={[3.6, .07, .48]} /></mesh>
        <group ref={frontFlaps} position={[0, -.16, 4.48]}>
          <mesh rotation={[-.08, 0, 0]} material={wingPaint}><boxGeometry args={[3.48, .055, .36]} /></mesh>
          <mesh position={[0, .13, -.27]} rotation={[-.12, 0, 0]} material={accent2Paint}><boxGeometry args={[3.34, .05, .3]} /></mesh>
        </group>
        <mesh position={[1.82, -.12, 4.55]} material={carbon}><boxGeometry args={[.055, .58, .78]} /></mesh>
        <mesh position={[-1.82, -.12, 4.55]} material={carbon}><boxGeometry args={[.055, .58, .78]} /></mesh>
        <mesh position={[0, -.27, 4.94]} material={accentPaint}><boxGeometry args={[3.35, .025, .045]} /></mesh>
      </group>

      <group onClick={click('rearWing')} position={[0, 0, axialExplode(-1)]}>
        <mesh position={[0, .24, -3.76]} rotation={[.06, 0, 0]} material={wingPaint}><boxGeometry args={[2.25, .055, .28]} /></mesh>
        <mesh position={[0, .78, -4.15]} rotation={[.08, 0, 0]} material={wingPaint}><boxGeometry args={[2.72, .075, .38]} /></mesh>
        <group ref={rearFlaps} position={[0, 1.0, -4.08]}>
          <mesh rotation={[.1, 0, 0]} material={wingPaint}><boxGeometry args={[2.62, .065, .38]} /></mesh>
          <mesh position={[0, .2, -.08]} rotation={[.14, 0, 0]} material={accent2Paint}><boxGeometry args={[2.52, .06, .33]} /></mesh>
        </group>
        <mesh position={[1.36, .67, -4.06]} material={carbon}><boxGeometry args={[.06, 1.34, .62]} /></mesh>
        <mesh position={[-1.36, .67, -4.06]} material={carbon}><boxGeometry args={[.06, 1.34, .62]} /></mesh>
        <mesh position={[0, .28, -3.83]} material={carbon}><boxGeometry args={[.16, 1.0, .14]} /></mesh>
        <mesh position={[0, 1.37, -4.12]} material={accentPaint}><boxGeometry args={[2.42, .03, .05]} /></mesh>
      </group>

      <group onClick={click('diffuser')} position={[0, exploded ? -.25 : 0, axialExplode(-1, .9)]}>
        <mesh position={[0, -.37, -3.75]} rotation={[.24, 0, 0]} material={carbon}><boxGeometry args={[2.38, .16, 1.2]} /></mesh>
        {[-.82, -.42, 0, .42, .82].map((x) => <mesh key={x} position={[x, -.28, -3.85]} rotation={[.24, 0, 0]} material={carbon}><boxGeometry args={[.035, .35, 1.0]} /></mesh>)}
      </group>

      <group onClick={click('halo')} position={[0, exploded ? .85 : 0, 0]}>
        <mesh position={[0, .86, .58]} rotation={[Math.PI / 2, 0, 0]} material={haloPaint}><torusGeometry args={[.46, .055, 12, 40, Math.PI]} /></mesh>
        <mesh position={[0, .63, .39]} material={haloPaint}><boxGeometry args={[.07, .6, .07]} /></mesh>
      </group>

      <group onClick={click('suspension')}>
        <Strut start={new THREE.Vector3(.42, -.05, 2.82)} end={frontHubR} material={carbon} />
        <Strut start={new THREE.Vector3(.42, .32, 3.05)} end={frontHubR} material={carbon} />
        <Strut start={new THREE.Vector3(.2, .44, 2.58)} end={frontHubR} material={carbon} />
        <Strut start={new THREE.Vector3(-.42, -.05, 2.82)} end={frontHubL} material={carbon} />
        <Strut start={new THREE.Vector3(-.42, .32, 3.05)} end={frontHubL} material={carbon} />
        <Strut start={new THREE.Vector3(-.2, .44, 2.58)} end={frontHubL} material={carbon} />
        <Strut start={new THREE.Vector3(.62, -.08, -2.72)} end={rearHubR} material={carbon} />
        <Strut start={new THREE.Vector3(.62, .26, -2.93)} end={rearHubR} material={carbon} />
        <Strut start={new THREE.Vector3(.35, .39, -2.52)} end={rearHubR} material={carbon} />
        <Strut start={new THREE.Vector3(-.62, -.08, -2.72)} end={rearHubL} material={carbon} />
        <Strut start={new THREE.Vector3(-.62, .26, -2.93)} end={rearHubL} material={carbon} />
        <Strut start={new THREE.Vector3(-.35, .39, -2.52)} end={rearHubL} material={carbon} />
      </group>

      <group onClick={click('wheels')}>
        <group position={[lateralExplode(frontWheelX, .9), 0, axialExplode(frontAxleZ, .45)]}><Wheel x={frontWheelX} z={frontAxleZ} width={frontTyreWidth} radius={frontTyreRadius} tire={tire} rim={rim} brake={brake} /></group>
        <group position={[lateralExplode(-frontWheelX, .9), 0, axialExplode(frontAxleZ, .45)]}><Wheel x={-frontWheelX} z={frontAxleZ} width={frontTyreWidth} radius={frontTyreRadius} tire={tire} rim={rim} brake={brake} /></group>
        <group position={[lateralExplode(rearWheelX, .9), 0, axialExplode(rearAxleZ, .45)]}><Wheel x={rearWheelX} z={rearAxleZ} width={rearTyreWidth} radius={rearTyreRadius} tire={tire} rim={rim} brake={brake} /></group>
        <group position={[lateralExplode(-rearWheelX, .9), 0, axialExplode(rearAxleZ, .45)]}><Wheel x={-rearWheelX} z={rearAxleZ} width={rearTyreWidth} radius={rearTyreRadius} tire={tire} rim={rim} brake={brake} /></group>
      </group>
      </group>

      {selected && <pointLight position={[0, 1.5, 0]} color={team.secondaryColor} intensity={1.25} distance={5} />}
    </group>
  )
}
