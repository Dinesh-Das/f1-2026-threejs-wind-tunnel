import { FlowParticles } from './FlowParticles'
import { Streamlines } from './Streamlines'
import { VortexField } from './VortexField'
import { VelocityField } from './VelocityField'
import { GroundEffect } from './GroundEffect'
import { useF1Store } from '../store/useF1Store'

export function WindTunnel() {
  const windTunnel = useF1Store((s) => s.windTunnel)
  const windSpeed = useF1Store((s) => s.windSpeed)
  const floorView = useF1Store((s) => s.floorView)
  const streamlines = useF1Store((s) => s.streamlines)
  const vortices = useF1Store((s) => s.vortices)
  const velocityField = useF1Store((s) => s.velocityField)
  const groundEffect = useF1Store((s) => s.groundEffect)
  if (!windTunnel || windSpeed <= 0 || floorView) return null
  return <group>
    <FlowParticles />
    {streamlines && <Streamlines />}
    {vortices && <VortexField />}
    {velocityField && <VelocityField />}
    {groundEffect && <GroundEffect />}
  </group>
}
