export type AeroMode = 'corner' | 'straight'

export type AeroFieldKind = 'precomputed-cfd' | 'geometry-aware-proxy'

export type AeroFieldMetadata = {
  source: string
  solver?: string
  speedKmh: number
  yawDeg: number
  aeroMode: AeroMode
  rideHeightMm?: number
  reynoldsNumber?: number
  geometryRevision?: string
  coordinateSystem?: string
  datasetIds?: string[]
  units?: {
    velocity: string
    pressure?: string
    vorticity?: string
  }
  description: string
}

export type AeroFieldSample = {
  /** Normalised scene-space velocity. Free stream is approximately magnitude 1. */
  velocity: [number, number, number]
  speedRatio: number
  /** Relative pressure estimate, or a dataset-derived pressure coefficient for a precomputed CFD provider. */
  pressureEstimate: number | null
  /** Relative vorticity magnitude for visualisation. */
  vorticity: number
  solid: boolean
}

export interface AeroFieldProvider {
  kind: AeroFieldKind
  metadata: AeroFieldMetadata
  sample(x: number, y: number, z: number, seed?: number): AeroFieldSample
  isSolid(x: number, y: number, z: number): boolean
  projectOutside(x: number, y: number, z: number): [number, number, number]
}

export type StreamlinePoint = {
  x: number
  y: number
  z: number
}
