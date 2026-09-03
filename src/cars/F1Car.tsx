import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Team } from '../data/teams'
import { useF1Store } from '../store/useF1Store'

type Props = { team: Team; position?: [number,number,number]; scale?: number; interactive?: boolean }
type Part = 'frontWing'|'nose'|'suspension'|'sidepods'|'floor'|'diffuser'|'rearWing'|'halo'|'wheels'

export function F1Car({ team, position = [0,0,0], scale = 1, interactive = true }: Props) {
  const exploded = useF1Store((s) => s.exploded)
  const xray = useF1Store((s) => s.xray)
  const pressure = useF1Store((s) => s.pressureMap)
  const activeAero = useF1Store((s) => s.activeAero)
  const aeroState = useF1Store((s) => s.activeAeroState)
  const selected = useF1Store((s) => s.selectedComponent)
  const set = useF1Store((s) => s.set)
  const rearFlap = useRef<THREE.Mesh>(null)
  const frontFlap = useRef<THREE.Mesh>(null)

  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color: team.primaryColor, metalness: team.materials.metallic, roughness: team.materials.roughness, clearcoat: team.materials.clearcoat, clearcoatRoughness: team.materials.clearcoatRoughness, transparent: true }), [team])
  const carbon = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#101214', metalness: .35, roughness: .34, clearcoat: .34, transparent: true }), [])
  const tire = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141414', roughness: .82, metalness: .04 }), [])
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5c6368', roughness: .23, metalness: .9 }), [])

  useFrame((_,dt) => {
    const opacity = xray ? .2 : 1
    paint.opacity = THREE.MathUtils.damp(paint.opacity, opacity, 5, dt)
    carbon.opacity = THREE.MathUtils.damp(carbon.opacity, xray ? .48 : 1, 5, dt)
    if (pressure) paint.color.lerp(new THREE.Color('#ff4d21'), 1 - Math.exp(-dt*3)); else paint.color.lerp(new THREE.Color(team.primaryColor), 1 - Math.exp(-dt*3))
    const angle = activeAero && aeroState === 'Straight' ? -0.16 : 0
    if (rearFlap.current) rearFlap.current.rotation.x = THREE.MathUtils.damp(rearFlap.current.rotation.x, angle, 5, dt)
    if (frontFlap.current) frontFlap.current.rotation.x = THREE.MathUtils.damp(frontFlap.current.rotation.x, angle * .65, 5, dt)
  })

  const click = (part: Part) => (event: { stopPropagation: () => void }) => { if (!interactive) return; event.stopPropagation(); set({ selectedComponent: part }) }
  const glow = (part: Part) => selected === part ? team.secondaryColor : undefined
  const offset = (part: Part): [number,number,number] => {
    if (!exploded) return [0,0,0]
    const m: Record<Part,[number,number,number]> = { frontWing:[0,0,2.2], nose:[0,.25,1.2], suspension:[1.4,.2,.3], sidepods:[1.8,.4,0], floor:[0,-1.0,0], diffuser:[0,-.4,-1.7], rearWing:[0,.6,-2], halo:[0,1.2,0], wheels:[2.0,.2,0] }
    return m[part]
  }

  const P = ({ part, children }: { part: Part; children: React.ReactNode }) => <group position={offset(part)} onClick={click(part)}>{children}</group>
  return (
    <group position={position} scale={scale} rotation={[0,Math.PI,0]}>
      <P part="floor"><mesh position={[0,-.28,0]} castShadow receiveShadow material={carbon}><boxGeometry args={[2.25,.09,5.7]} /></mesh><mesh position={[0,-.22,-2.9]} material={carbon}><boxGeometry args={[2.05,.18,.75]} /></mesh></P>
      <group>
        {/* CapsuleGeometry is Y-aligned by default. Rotate it onto Z so the
            monocoque reads as a low, longitudinal race-car tub. */}
        <mesh position={[0,.2,.25]} rotation={[Math.PI/2,0,0]} scale={[1,.92,1]} castShadow material={paint}><capsuleGeometry args={[.56,3.35,12,28]} /></mesh>
        <mesh position={[0,.38,-1.28]} rotation={[Math.PI/2,0,0]} scale={[.92,.72,1]} castShadow material={paint}><capsuleGeometry args={[.5,1.85,10,24]} /></mesh>
        <mesh position={[0,.47,-1.05]} rotation={[Math.PI/2,0,0]} scale={[.4,.78,1]} castShadow material={paint}><coneGeometry args={[.78,2.4,28]} /></mesh>
        <mesh position={[0,.58,.46]} rotation={[Math.PI/2,0,0]} castShadow material={carbon}><capsuleGeometry args={[.38,.58,10,24]} /></mesh>
        <mesh position={[0,.83,-.28]} castShadow material={carbon}><cylinderGeometry args={[.28,.34,.38,24]} /></mesh>
      </group>
      <P part="nose">
        <mesh position={[0,.12,2.5]} rotation={[Math.PI/2,0,0]} scale={[.72,.62,1]} castShadow material={paint}><coneGeometry args={[.46,2.65,24]} /></mesh>
        <mesh position={[0,-.02,3.35]} castShadow material={carbon}><boxGeometry args={[.58,.08,.72]} /></mesh>
      </P>
      <P part="sidepods">
        <mesh position={[1.03,.13,-.18]} rotation={[0,.12,0]} scale={[1,.82,1]} castShadow material={paint}><boxGeometry args={[1.22,.58,2.2]} /></mesh>
        <mesh position={[-1.03,.13,-.18]} rotation={[0,-.12,0]} scale={[1,.82,1]} castShadow material={paint}><boxGeometry args={[1.22,.58,2.2]} /></mesh>
        <mesh position={[1.36,.18,.54]} rotation={[0,.12,0]} material={carbon}><boxGeometry args={[.1,.34,.72]} /></mesh>
        <mesh position={[-1.36,.18,.54]} rotation={[0,-.12,0]} material={carbon}><boxGeometry args={[.1,.34,.72]} /></mesh>
      </P>
      <P part="frontWing"><mesh position={[0,-.03,3.73]} castShadow material={carbon}><boxGeometry args={[3.7,.12,.72]} /></mesh><mesh ref={frontFlap} position={[0,.12,3.5]} castShadow material={carbon}><boxGeometry args={[3.45,.08,.45]} /></mesh></P>
      <P part="rearWing"><mesh position={[0,1.03,-3.35]} castShadow material={carbon}><boxGeometry args={[3.25,.1,.58]} /></mesh><mesh ref={rearFlap} position={[0,1.24,-3.25]} castShadow material={paint}><boxGeometry args={[3.05,.1,.42]} /></mesh><mesh position={[1.52,.72,-3.25]} material={carbon}><boxGeometry args={[.08,1.15,.7]} /></mesh><mesh position={[-1.52,.72,-3.25]} material={carbon}><boxGeometry args={[.08,1.15,.7]} /></mesh></P>
      <P part="diffuser"><mesh position={[0,-.16,-3.34]} rotation={[.2,0,0]} material={carbon}><boxGeometry args={[2.3,.18,.82]} /></mesh></P>
      <P part="halo"><mesh position={[0,1.03,.52]} rotation={[Math.PI/2,0,0]} material={metal}><torusGeometry args={[.48,.065,10,32,Math.PI]} /></mesh><mesh position={[0,.83,.35]} material={metal}><boxGeometry args={[.08,.65,.08]} /></mesh></P>
      <P part="suspension">{[[1.25,.02,2.25],[-1.25,.02,2.25],[1.25,.02,-2.15],[-1.25,.02,-2.15]].map((p,i) => <mesh key={i} position={p as [number,number,number]} rotation={[0,0,i%2 ? -.72 : .72]} material={metal}><cylinderGeometry args={[.035,.035,1.75,10]} /></mesh>)}</P>
      <P part="wheels">{[[1.62,0,2.34],[-1.62,0,2.34],[1.62,0,-2.24],[-1.62,0,-2.24]].map((p,i) => <group key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}><mesh castShadow material={tire}><cylinderGeometry args={[.63,.63,.47,32]} /></mesh><mesh material={metal}><cylinderGeometry args={[.31,.31,.49,20]} /></mesh></group>)}</P>
      {selected && <pointLight position={[0,1.8,0]} color={glow(selected as Part)} intensity={2.5} distance={5} />}
    </group>
  )
}
