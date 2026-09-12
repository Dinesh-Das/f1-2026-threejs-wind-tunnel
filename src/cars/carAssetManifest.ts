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
  modelPath: '/assets/cars/base/scene.gltf',
  source: {
    title: 'basic Lowpoly F1 Car V1',
    url: 'https://sketchfab.com/3d-models/basic-lowpoly-f1-car-v1-b4c6a1cfe0154f4d86b39ff3b7f955a1',
    author: 'arthihalder',
  },
  license: {
    name: 'CC-BY-4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    attributionRequired: true,
    attribution: '“basic Lowpoly F1 Car V1” by arthihalder, licensed under CC BY 4.0.',
  },
  accuracy: 'placeholder' as const,
  worldScale: 1,
  axes: { forward: '+Z' as const, up: '+Y' as const },
  wheelNodes: {
    frontLeft: ['Wheel Front Left_3', 'Wheel Front Left.001_0'],
    frontRight: ['Front Axles hub right_4'],
    rearLeft: ['Wheel Back Left_20', 'Wheel Back Left.001_21'],
    rearRight: ['Rear Axles_10'],
  },
  activeAero: {
    // The bundled low-poly fallback has no independently modelled 2026 active
    // flap geometry or trustworthy hinge metadata. Do not animate arbitrary
    // wing groups and present that motion as a regulation-accurate mechanism.
    front: null,
    rear: null,
  },
  semantics: {
    frontWing: ['Front wing_7'],
    nose: ['Main whole body_19'],
    frontSuspension: ['Front Axles_6', 'Front Axles hub left_1', 'Front Axles hub right_4'],
    frontWheels: ['Wheel Front Left_3', 'Wheel Front Left.001_0', 'Front Axles hub right_4'],
    sidepods: ['Side wings_18'],
    floor: ['Ground plate_8', 'under side wings_17'],
    rearSuspension: ['Rear Axles_10'],
    rearWing: ['Rear wing_13', 'small peice from rear wing_12'],
    rearWheels: ['Wheel Back Left_20', 'Wheel Back Left.001_21', 'Rear Axles_10'],
    halo: ['Seafty bars_14'],
    cockpit: ['Seat_16', 'stearing wheel_15'],
    bodywork: ['Main whole body_19'],
  },
  materialMappings: {
    body: ['main_body_colour_Black', 'main_body_colour_Red.001', 'main_body_colour_white'],
    tire: ['wheel_tires'],
    rim: ['rims'],
    interior: ['SEAT', 'yoke_wheel'],
    glass: ['display', 'mirror'],
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
        'Team-colour presentation on shared low-poly reference geometry; exact 2026 constructor geometry is not represented.',
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
