import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import * as THREE from 'three'
import { freeStreamData } from '../data/f1Reference'
import type { AeroFieldSample } from './core/aeroTypes'
import { useAeroField } from './core/useAeroField'

type ProbeReading = {
  point: THREE.Vector3
  sample: AeroFieldSample
}

export function FlowProbe() {
  const provider = useAeroField()
  const [reading, setReading] = useState<ProbeReading | null>(null)
  const updateReading = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const point = event.point.clone()
    setReading({ point, sample: provider.sample(point.x, point.y, point.z, 0.5) })
  }
  const freeStream = freeStreamData(provider.metadata.speedKmh).speedMs

  return (
    <group>
      <mesh
        position={[0, 0.62, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={updateReading}
        onClick={updateReading}
        onPointerOut={() => setReading(null)}
      >
        <planeGeometry args={[8.2, 16]} />
        <meshBasicMaterial transparent opacity={0.012} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {reading && (
        <group position={[reading.point.x, reading.point.y + 0.08, reading.point.z]}>
          <mesh>
            <sphereGeometry args={[0.055, 14, 14]} />
            <meshBasicMaterial color="#9cecff" />
          </mesh>
          <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div className="flow-probe-card">
              <b>FLOW PROBE</b>
              <span>
                xyz {reading.point.x.toFixed(2)}, {reading.point.y.toFixed(2)}, {reading.point.z.toFixed(2)}
              </span>
              <span>local velocity {(freeStream * reading.sample.speedRatio).toFixed(1)} m/s</span>
              <span>V/V∞ {reading.sample.speedRatio.toFixed(2)}</span>
              <span>
                relative pressure{' '}
                {reading.sample.pressureEstimate === null ? 'n/a' : reading.sample.pressureEstimate.toFixed(2)}
              </span>
              <span>relative vorticity {reading.sample.vorticity.toFixed(2)}</span>
              <small>{provider.kind === 'precomputed-cfd' ? 'CFD dataset' : 'geometry-aware approximation'}</small>
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
