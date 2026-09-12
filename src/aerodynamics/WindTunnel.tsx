import { FlowParticles } from './FlowParticles'
import { Streamlines } from './Streamlines'
import { VortexField } from './VortexField'
import { VelocityField } from './VelocityField'
import { GroundEffect } from './GroundEffect'
import { RelativePressureField } from './RelativePressureField'
import { WakeField } from './WakeField'
import { FlowSlice } from './FlowSlice'
import { FlowProbe } from './FlowProbe'
import { useF1Store } from '../store/useF1Store'

export function WindTunnel() {
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const floorView = useF1Store((s) => s.floorView)
  const flowParticles = useF1Store((s) => s.flowParticles)
  const streamlines = useF1Store((s) => s.streamlines)
  const vortices = useF1Store((s) => s.vortices)
  const velocityField = useF1Store((s) => s.velocityField)
  const pressureField = useF1Store((s) => s.pressureField)
  const wakeField = useF1Store((s) => s.wakeField)
  const slicePlane = useF1Store((s) => s.slicePlane)
  const flowProbe = useF1Store((s) => s.flowProbe)
  const groundEffect = useF1Store((s) => s.groundEffect)
  if (!windTunnel || windSpeed <= 0 || floorView) return null
  return (
    <group>
      {flowParticles && <FlowParticles />}
      {streamlines && <Streamlines />}
      {vortices && <VortexField />}
      {velocityField && <VelocityField />}
      {pressureField && <RelativePressureField />}
      {wakeField && <WakeField />}
      {slicePlane && <FlowSlice />}
      {flowProbe && <FlowProbe />}
      {groundEffect && <GroundEffect />}
    </group>
  )
}
