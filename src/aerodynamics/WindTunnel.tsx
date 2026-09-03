import { FlowParticles } from './FlowParticles'
import { Streamlines } from './Streamlines'
import { VortexField } from './VortexField'
import { VelocityField } from './VelocityField'
import { GroundEffect } from './GroundEffect'
import { useF1Store } from '../store/useF1Store'

export function WindTunnel() {
  const s = useF1Store()
  if (!s.windTunnel) return null
  return <group>
    <FlowParticles />
    {s.streamlines && <Streamlines />}
    {s.vortices && <VortexField />}
    {s.velocityField && <VelocityField />}
    {s.groundEffect && <GroundEffect />}
  </group>
}
