import type { AeroMode } from './aeroTypes'

export type CfdDatasetReference = {
  id: string
  path: string
  format: 'json-grid-v1'
  conditions: {
    speedKmh: number
    yawDeg: number
    aeroMode: AeroMode
  }
  /** Only datasets with the same non-empty group are eligible for speed interpolation. */
  interpolationGroup?: string
}

export type PrecomputedCfdDataset = {
  schemaVersion: 1
  id: string
  metadata: {
    source: string
    solver?: string
    geometryRevision: string
    coordinateSystem: string
    speedKmh: number
    yawDeg: number
    aeroMode: AeroMode
    rideHeightMm?: number
    reynoldsNumber?: number
    characteristicLengthM: number
    description: string
    units: {
      spatial: 'scene-unit'
      velocity: 'm/s'
      pressure?: 'Pa-relative' | 'Cp'
      vorticity?: '1/s' | 'dimensionless'
      wakeDeficit?: 'ratio'
    }
  }
  grid: {
    /** Coordinates use the application's scene coordinate system declared in metadata.coordinateSystem. */
    origin: [number, number, number]
    spacing: [number, number, number]
    dimensions: [number, number, number]
    /** Interleaved xyz velocity components, x-fastest grid ordering. */
    velocity: number[]
    pressure?: number[]
    vorticity?: number[]
    wakeDeficit?: number[]
    /** Optional 0/1 occupancy values in the same x-fastest grid ordering. */
    solidMask?: number[]
  }
}

export type CfdRequestConditions = {
  speedKmh: number
  yawDeg: number
  aeroMode: AeroMode
}

export type SelectedCfdReferences = [] | [CfdDatasetReference] | [CfdDatasetReference, CfdDatasetReference]

function finiteTuple(values: readonly number[]) {
  return values.every(Number.isFinite)
}

export function cfdCellCount(dataset: PrecomputedCfdDataset) {
  const [nx, ny, nz] = dataset.grid.dimensions
  return nx * ny * nz
}

export function validatePrecomputedCfdDataset(dataset: PrecomputedCfdDataset): string[] {
  const issues: string[] = []
  if (dataset.schemaVersion !== 1) issues.push(`Unsupported CFD schema version: ${String(dataset.schemaVersion)}.`)
  if (!dataset.id.trim()) issues.push('CFD dataset id is required.')
  if (!dataset.metadata.source.trim()) issues.push('CFD dataset source is required.')
  if (!dataset.metadata.geometryRevision.trim()) issues.push('CFD geometry revision is required.')
  if (!dataset.metadata.coordinateSystem.trim()) issues.push('CFD coordinate system is required.')
  if (!Number.isFinite(dataset.metadata.speedKmh) || dataset.metadata.speedKmh < 0) {
    issues.push('CFD dataset speed must be a finite non-negative value.')
  }
  if (!Number.isFinite(dataset.metadata.yawDeg)) issues.push('CFD dataset yaw must be finite.')
  if (!Number.isFinite(dataset.metadata.characteristicLengthM) || dataset.metadata.characteristicLengthM <= 0) {
    issues.push('CFD characteristic length must be a finite positive value.')
  }

  const { dimensions, origin, spacing } = dataset.grid
  if (!finiteTuple(origin)) issues.push('CFD grid origin must contain finite values.')
  if (!finiteTuple(spacing) || spacing.some((value) => value <= 0)) {
    issues.push('CFD grid spacing must contain finite positive values.')
  }
  if (dimensions.some((value) => !Number.isInteger(value) || value < 2)) {
    issues.push('CFD grid dimensions must be integers >= 2 for trilinear interpolation.')
  }

  const cells = cfdCellCount(dataset)
  if (!Number.isSafeInteger(cells) || cells <= 0) issues.push('CFD grid cell count is invalid.')
  if (dataset.grid.velocity.length !== cells * 3) {
    issues.push(`CFD velocity array must contain ${cells * 3} values.`)
  } else if (!dataset.grid.velocity.every(Number.isFinite)) {
    issues.push('CFD velocity array contains non-finite values.')
  }

  for (const [name, values] of [
    ['pressure', dataset.grid.pressure],
    ['vorticity', dataset.grid.vorticity],
    ['wakeDeficit', dataset.grid.wakeDeficit],
    ['solidMask', dataset.grid.solidMask],
  ] as const) {
    if (!values) continue
    if (values.length !== cells) issues.push(`CFD ${name} array must contain ${cells} values.`)
    else if (!values.every(Number.isFinite)) issues.push(`CFD ${name} array contains non-finite values.`)
  }

  if (dataset.grid.solidMask?.some((value) => value !== 0 && value !== 1)) {
    issues.push('CFD solidMask values must be 0 or 1.')
  }
  return issues
}

export function assertValidPrecomputedCfdDataset(dataset: PrecomputedCfdDataset) {
  const issues = validatePrecomputedCfdDataset(dataset)
  if (issues.length)
    throw new Error(`Invalid precomputed CFD dataset ${dataset.id || '<unnamed>'}: ${issues.join(' ')}`)
}

export function selectCfdDatasetReferences(
  references: readonly CfdDatasetReference[] | undefined,
  request: CfdRequestConditions,
): SelectedCfdReferences {
  if (!references?.length) return []
  const compatibleYawAndMode = references.filter(
    (reference) =>
      reference.conditions.aeroMode === request.aeroMode &&
      Math.abs(reference.conditions.yawDeg - request.yawDeg) <= 0.25,
  )
  const exact = compatibleYawAndMode
    .filter((reference) => Math.abs(reference.conditions.speedKmh - request.speedKmh) <= 0.5)
    .sort(
      (a, b) => Math.abs(a.conditions.speedKmh - request.speedKmh) - Math.abs(b.conditions.speedKmh - request.speedKmh),
    )[0]
  if (exact) return [exact]

  const groups = new Map<string, CfdDatasetReference[]>()
  for (const reference of compatibleYawAndMode) {
    if (!reference.interpolationGroup) continue
    const group = groups.get(reference.interpolationGroup) ?? []
    group.push(reference)
    groups.set(reference.interpolationGroup, group)
  }

  let best: [CfdDatasetReference, CfdDatasetReference] | null = null
  let bestSpan = Number.POSITIVE_INFINITY
  for (const group of groups.values()) {
    const lower = group
      .filter((reference) => reference.conditions.speedKmh < request.speedKmh)
      .sort((a, b) => b.conditions.speedKmh - a.conditions.speedKmh)[0]
    const upper = group
      .filter((reference) => reference.conditions.speedKmh > request.speedKmh)
      .sort((a, b) => a.conditions.speedKmh - b.conditions.speedKmh)[0]
    if (!lower || !upper) continue
    const span = upper.conditions.speedKmh - lower.conditions.speedKmh
    if (span < bestSpan) {
      best = [lower, upper]
      bestSpan = span
    }
  }
  return best ?? []
}

export async function loadPrecomputedCfdDataset(reference: CfdDatasetReference, signal?: AbortSignal) {
  if (reference.format !== 'json-grid-v1') throw new Error(`Unsupported CFD dataset format: ${reference.format}`)
  const response = await fetch(reference.path, { signal })
  if (!response.ok) throw new Error(`Failed to load CFD dataset ${reference.id}: HTTP ${response.status}`)
  const dataset = (await response.json()) as PrecomputedCfdDataset
  assertValidPrecomputedCfdDataset(dataset)
  if (dataset.id !== reference.id) {
    throw new Error(`CFD dataset id mismatch: manifest=${reference.id}, file=${dataset.id}.`)
  }
  if (
    dataset.metadata.aeroMode !== reference.conditions.aeroMode ||
    Math.abs(dataset.metadata.speedKmh - reference.conditions.speedKmh) > 0.01 ||
    Math.abs(dataset.metadata.yawDeg - reference.conditions.yawDeg) > 0.01
  ) {
    throw new Error(`CFD dataset conditions do not match manifest reference ${reference.id}.`)
  }
  return dataset
}
