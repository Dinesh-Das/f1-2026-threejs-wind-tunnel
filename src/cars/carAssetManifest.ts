import type { CfdDatasetReference } from '../aerodynamics/core/cfdDataset'

export type CarAccuracyClassification =
  'licensed-team-model' | 'high-detail-reference-recreation' | '2026-regulation-reference' | 'placeholder'

export type CarSemanticComponent =
  | 'frontWing'
  | 'frontActiveFlaps'
  | 'nose'
  | 'frontSuspension'
  | 'frontWheels'
  | 'sidepods'
  | 'floor'
  | 'diffuser'
  | 'rearSuspension'
  | 'rearWing'
  | 'rearActiveFlaps'
  | 'rearWheels'
  | 'halo'
  | 'cockpit'
  | 'bodywork'

export type ActiveAeroNodeMapping = {
  name: string
  /** Hinge axis expressed in the mapped node parent's local coordinate system. */
  axis: 'x' | 'y' | 'z'
  pivot:
    | { kind: 'node-origin' }
    | {
        /** Hinge point expressed in the mapped node parent's local coordinate system. */
        kind: 'parent-local-point'
        point: [number, number, number]
      }
}

export type ActiveAeroMapping = {
  nodes: ActiveAeroNodeMapping[]
  cornerAngleDeg: number
  straightAngleDeg: number
}

export type WheelPosition = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight'
export type WheelRotationAxis = 'x' | 'y' | 'z'

export type CarAssetManifest = {
  teamId: string
  constructor: string
  chassisName: string | null
  modelPath: string
  referenceRevision: string
  referenceAsOf: string | null
  source: {
    title: string
    url: string
    author?: string
  }
  license: {
    name: string
    url?: string
    attributionRequired: boolean
    attribution?: string
  }
  accuracy: CarAccuracyClassification
  worldScale: number
  axes: {
    forward: '+Z' | '-Z' | '+X' | '-X'
    up: '+Y' | '+Z'
  }
  wheelNodes: {
    frontLeft: string[]
    frontRight: string[]
    rearLeft: string[]
    rearRight: string[]
  }
  /** Production assets must provide an explicitly validated spin axis for every mapped wheel. */
  wheelRotationAxes?: Partial<Record<WheelPosition, WheelRotationAxis>>
  activeAero: {
    front: ActiveAeroMapping | null
    rear: ActiveAeroMapping | null
  }
  semantics: Partial<Record<CarSemanticComponent, string[]>>
  materialMappings: Record<string, string[]>
  liveryTextures?: string[]
  decalTextures?: string[]
  lodPaths?: string[]
  cfdDatasets?: CfdDatasetReference[]
  expected: {
    wheelbaseM: number
    maxWidthM: number
  }
  fallbackForTeam: boolean
}

const referenceModel = {
  modelPath: '/assets/cars/reference-26/reference-26.glb',
  lodPaths: [
    '/assets/cars/reference-26/reference-26-standard.glb',
    '/assets/cars/reference-26/reference-26-performance.glb',
  ],
  source: {
    title: 'Formula Reference 26',
    url: 'https://github.com/Dinesh-Das/f1-2026-threejs-wind-tunnel',
    author: 'Original project geometry',
  },
  license: {
    name: 'CC0 geometry · MAGENTA lettering',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attributionRequired: true,
    attribution: 'Original vehicle geometry. Helvetiker lettering: MAGENTA Ltd.; font notice included with the asset.',
  },
  accuracy: 'high-detail-reference-recreation' as const,
  worldScale: 2,
  axes: { forward: '+Z' as const, up: '+Y' as const },
  wheelNodes: {
    frontLeft: ['FrontLeftWheel'],
    frontRight: ['FrontRightWheel'],
    rearLeft: ['RearLeftWheel'],
    rearRight: ['RearRightWheel'],
  },
  wheelRotationAxes: {
    frontLeft: 'x' as const,
    frontRight: 'x' as const,
    rearLeft: 'x' as const,
    rearRight: 'x' as const,
  },
  activeAero: {
    // Design-study hinge motion, not constructor mechanism measurements.
    front: {
      nodes: [{ name: 'FrontFlap', axis: 'x' as const, pivot: { kind: 'node-origin' as const } }],
      cornerAngleDeg: 0,
      straightAngleDeg: -14,
    },
    rear: {
      nodes: [{ name: 'RearFlap', axis: 'x' as const, pivot: { kind: 'node-origin' as const } }],
      cornerAngleDeg: 0,
      straightAngleDeg: -24,
    },
  },
  semantics: {
    frontWing: ['FrontWing'],
    frontActiveFlaps: ['FrontFlap'],
    nose: ['Nose'],
    frontSuspension: ['FrontSuspension'],
    frontWheels: ['FrontLeftWheel', 'FrontRightWheel'],
    sidepods: ['Sidepods'],
    floor: ['Floor'],
    diffuser: ['Diffuser'],
    rearSuspension: ['RearSuspension'],
    rearWing: ['RearWing'],
    rearActiveFlaps: ['RearFlap'],
    rearWheels: ['RearLeftWheel', 'RearRightWheel'],
    halo: ['Halo'],
    cockpit: ['Cockpit'],
    bodywork: ['Bodywork'],
  },
  materialMappings: {
    body: ['body'],
    secondary: ['secondary'],
    accent: ['accent'],
    carbon: ['carbon'],
    tire: ['tire'],
    rim: ['rim'],
    metal: ['metal'],
    marking: ['marking'],
    interior: ['interior'],
    glass: ['glass'],
  },
  expected: {
    wheelbaseM: 3.4,
    maxWidthM: 1.9,
  },
  fallbackForTeam: true,
}

type ManifestSeed = Pick<CarAssetManifest, 'teamId' | 'constructor' | 'chassisName' | 'referenceAsOf'>

const seeds: ManifestSeed[] = [
  { teamId: 'mclaren', constructor: 'McLaren', chassisName: null, referenceAsOf: null },
  { teamId: 'mercedes', constructor: 'Mercedes', chassisName: null, referenceAsOf: null },
  { teamId: 'ferrari', constructor: 'Ferrari', chassisName: null, referenceAsOf: null },
  { teamId: 'redbull', constructor: 'Red Bull Racing', chassisName: null, referenceAsOf: null },
  { teamId: 'racing-bulls', constructor: 'Racing Bulls', chassisName: null, referenceAsOf: null },
  { teamId: 'alpine', constructor: 'Alpine', chassisName: null, referenceAsOf: null },
  { teamId: 'haas', constructor: 'Haas', chassisName: null, referenceAsOf: null },
  { teamId: 'audi', constructor: 'Audi', chassisName: null, referenceAsOf: null },
  { teamId: 'williams', constructor: 'Williams', chassisName: null, referenceAsOf: null },
  { teamId: 'aston-martin', constructor: 'Aston Martin', chassisName: null, referenceAsOf: null },
  { teamId: 'cadillac', constructor: 'Cadillac', chassisName: null, referenceAsOf: null },
]

export const carAssetManifests: Record<string, CarAssetManifest> = Object.fromEntries(
  seeds.map((seed) => [
    seed.teamId,
    {
      ...referenceModel,
      ...seed,
      referenceRevision:
        'Original high-detail Formula-style design study with shared geometry and team-color treatments. Not constructor CAD or verified regulation geometry.',
    } satisfies CarAssetManifest,
  ]),
)

export function carManifestForTeam(teamId: string): CarAssetManifest {
  return carAssetManifests[teamId] ?? carAssetManifests.mclaren
}

export function manifestAccuracyLabel(manifest: CarAssetManifest) {
  switch (manifest.accuracy) {
    case 'licensed-team-model':
      return 'LICENSED TEAM MODEL'
    case 'high-detail-reference-recreation':
      return 'HIGH-DETAIL REFERENCE RECREATION'
    case '2026-regulation-reference':
      return '2026 REGULATION REFERENCE'
    default:
      return 'GEOMETRY PLACEHOLDER'
  }
}
