import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FLOW_SCENARIOS } from '../src/aerodynamics/core/flowScenarios'
import type { GeometryFieldSnapshot } from '../src/aerodynamics/core/geometryFieldRegistry'
import {
  selectCfdDatasetReferences,
  validatePrecomputedCfdDataset,
  type CfdDatasetReference,
  type PrecomputedCfdDataset,
} from '../src/aerodynamics/core/cfdDataset'
import {
  GeometryProxyFieldProvider,
  integrateGeometryStreamline,
} from '../src/aerodynamics/providers/GeometryProxyFieldProvider'
import { PrecomputedCfdFieldProvider } from '../src/aerodynamics/providers/PrecomputedCfdFieldProvider'
import { validateCarManifest } from '../src/cars/assetValidation'
import { carAssetManifests, carManifestForTeam, type CarAssetManifest } from '../src/cars/carAssetManifest'
import { measureMappedWheelbaseScene, validateLoadedCarAsset } from '../src/cars/runtimeAssetValidation'
import { findMappedObject, mappedNodeNameMatches, runtimeNodeNameFor } from '../src/cars/nodeMapping'
import {
  F1_2026_REFERENCE,
  freeStreamData,
  reynoldsNumber,
  rollingRoadSceneSpeed,
  wheelAngularVelocityRadS,
  wheelKinematics,
} from '../src/data/f1Reference'
import { teams } from '../src/data/teams'
import { useF1Store } from '../src/store/useF1Store'

const snapshot: GeometryFieldSnapshot = {
  teamId: 'mclaren',
  sourceModel: '/assets/cars/base/scene.gltf',
  bounds: { min: [-1.4, -0.45, -3.6], max: [1.4, 1.2, 3.6] },
  obstacles: [
    { semantic: 'bodywork', min: [-0.55, -0.2, -2], max: [0.55, 0.8, 2] },
    { semantic: 'frontWheels', min: [-1.2, -0.35, 1.7], max: [-0.65, 0.45, 2.45] },
  ],
}

const symmetricSnapshot: GeometryFieldSnapshot = {
  ...snapshot,
  obstacles: [
    { semantic: 'bodywork', min: [-0.55, -0.2, -2], max: [0.55, 0.8, 2] },
    { semantic: 'frontWheels', min: [-1.2, -0.35, 1.7], max: [-0.65, 0.45, 2.45] },
    { semantic: 'frontWheels', min: [0.65, -0.35, 1.7], max: [1.2, 0.45, 2.45] },
  ],
}

function syntheticCfdDataset(
  id: string,
  speedKmh: number,
  speedRatio = 1,
  aeroMode: 'corner' | 'straight' = 'corner',
): PrecomputedCfdDataset {
  const speedMs = speedKmh / 3.6
  const dynamicPressurePa = 0.5 * 1.225 * speedMs * speedMs
  const cells = 8
  return {
    schemaVersion: 1,
    id,
    metadata: {
      source: 'Synthetic unit-test CFD grid',
      solver: 'test-fixture',
      geometryRevision: 'fixture-v1',
      coordinateSystem: 'scene:+X-right,+Y-up,-Z-flow',
      speedKmh,
      yawDeg: 0,
      aeroMode,
      characteristicLengthM: 3.4,
      description: 'Synthetic grid used only to verify the runtime CFD adapter.',
      units: {
        spatial: 'scene-unit',
        velocity: 'm/s',
        pressure: 'Pa-relative',
        vorticity: '1/s',
      },
    },
    grid: {
      origin: [-1, -1, -1],
      spacing: [2, 2, 2],
      dimensions: [2, 2, 2],
      velocity: Array.from({ length: cells }, () => [0, 0, -speedMs * speedRatio]).flat(),
      pressure: Array(cells).fill(dynamicPressurePa * 0.2),
      vorticity: Array(cells).fill(2),
      solidMask: [1, 0, 0, 0, 0, 0, 0, 0],
    },
  }
}

describe('public reference math', () => {
  it('derives free-stream quantities and zero-speed invariants', () => {
    const data = freeStreamData(300)
    expect(data.speedMs).toBeCloseTo(83.333, 3)
    expect(data.dynamicPressureKpa).toBeCloseTo(4.253, 3)
    expect(data.mach).toBeCloseTo(0.243, 3)
    expect(freeStreamData(0).dynamicPressureKpa).toBe(0)
    expect(rollingRoadSceneSpeed(0)).toBe(0)
    expect(wheelAngularVelocityRadS(0, 'front')).toBe(0)
    expect(wheelAngularVelocityRadS(0, 'rear')).toBe(0)
    expect(wheelKinematics(0)).toEqual({ frontRpm: 0, rearRpm: 0 })
  })

  it('matches rolling-road speed to free stream and derives wheel angular velocity from tyre radius', () => {
    const speedKmh = 252
    const speedMs = freeStreamData(speedKmh).speedMs
    expect(rollingRoadSceneSpeed(speedKmh)).toBeCloseTo(speedMs * F1_2026_REFERENCE.sceneUnitsPerMetre, 8)
    expect(wheelAngularVelocityRadS(speedKmh, 'front')).toBeCloseTo(
      speedMs / (F1_2026_REFERENCE.frontTyreDiameterM * 0.5),
      8,
    )
    expect(wheelAngularVelocityRadS(speedKmh, 'rear')).toBeCloseTo(
      speedMs / (F1_2026_REFERENCE.rearTyreDiameterM * 0.5),
      8,
    )
  })

  it('scales dynamic pressure with velocity squared and keeps reference dimensions sane', () => {
    expect(freeStreamData(300).dynamicPressureKpa / freeStreamData(150).dynamicPressureKpa).toBeCloseTo(4, 6)
    expect(reynoldsNumber(300)).toBeCloseTo(19.18e6, -4)
    expect(F1_2026_REFERENCE.maxWheelbaseM).toBeGreaterThan(3)
    expect(F1_2026_REFERENCE.maxWidthM).toBeLessThanOrEqual(1.9)
  })
})

describe('team and asset manifests', () => {
  it('contains eleven unique teams with two drivers, local logos, and attribution', () => {
    expect(teams).toHaveLength(11)
    expect(new Set(teams.map((team) => team.id)).size).toBe(11)
    for (const team of teams) {
      expect(team.drivers).toHaveLength(2)
      expect(existsSync(join(process.cwd(), 'public', team.logo))).toBe(true)
    }
    const licensePath = join(process.cwd(), 'public', 'assets', 'cars', 'base', 'LICENSE.txt')
    expect(readFileSync(licensePath, 'utf8')).toMatch(/CC-BY-4\.0|Attribution 4\.0/i)
  })

  it('has a valid, traceable manifest for every team and an existing model asset', () => {
    expect(Object.keys(carAssetManifests)).toHaveLength(11)
    for (const team of teams) {
      const manifest = carManifestForTeam(team.id)
      expect(manifest.teamId).toBe(team.id)
      expect(manifest.source.url).toMatch(/^https:\/\//)
      expect(manifest.license.name.length).toBeGreaterThan(0)
      expect(existsSync(join(process.cwd(), 'public', manifest.modelPath.replace(/^\//, '')))).toBe(true)
      const errors = validateCarManifest(manifest).filter((issue) => issue.severity === 'error')
      expect(errors).toEqual([])
      expect(
        validateCarManifest(manifest).some((issue) => issue.code === 'active-aero' && issue.severity === 'warning'),
      ).toBe(true)
    }
  })

  it('keeps the shared fallback manifest mappings traceable to real glTF node names', () => {
    const gltfPath = join(process.cwd(), 'public', 'assets', 'cars', 'base', 'scene.gltf')
    const gltf = JSON.parse(readFileSync(gltfPath, 'utf8')) as { nodes?: Array<{ name?: string }> }
    const nodeNames = new Set(
      (gltf.nodes ?? []).map((node) => node.name).filter((name): name is string => Boolean(name)),
    )
    const manifest = carManifestForTeam('mclaren')

    for (const names of Object.values(manifest.wheelNodes)) {
      for (const name of names) expect(nodeNames.has(name)).toBe(true)
    }
    for (const names of Object.values(manifest.semantics)) {
      for (const name of names ?? []) expect(nodeNames.has(name)).toBe(true)
    }
  })

  it('resolves source glTF manifest names after GLTFLoader runtime sanitization', () => {
    const root = new THREE.Group()
    const sourceName = 'Wheel Front Left.001_0'
    const runtimeName = runtimeNodeNameFor(sourceName)
    const node = new THREE.Group()
    node.name = runtimeName
    root.add(node)

    expect(runtimeName).toBe('Wheel_Front_Left001_0')
    expect(mappedNodeNameMatches(runtimeName, sourceName)).toBe(true)
    expect(findMappedObject(root, sourceName)).toBe(node)
  })

  it('rejects production manifests without required semantics or active-aero mappings', () => {
    const base = carManifestForTeam('mclaren')
    const invalid: CarAssetManifest = {
      ...base,
      accuracy: 'licensed-team-model',
      semantics: {},
      activeAero: { front: null, rear: null },
      fallbackForTeam: false,
    }
    const errors = validateCarManifest(invalid).filter((issue) => issue.severity === 'error')
    expect(errors.some((issue) => issue.code === 'active-aero')).toBe(true)
    expect(errors.some((issue) => issue.code === 'semantic-frontWing')).toBe(true)
    expect(errors.some((issue) => issue.code === 'wheel-axis-frontLeft')).toBe(true)
  })

  it('accepts production wheel mappings only when every wheel has a validated rotation axis', () => {
    const base = carManifestForTeam('mclaren')
    const production: CarAssetManifest = {
      ...base,
      accuracy: 'licensed-team-model',
      fallbackForTeam: false,
      semantics: { ...base.semantics, diffuser: ['Diffuser'] },
      wheelRotationAxes: {
        frontLeft: 'x',
        frontRight: 'x',
        rearLeft: 'x',
        rearRight: 'x',
      },
      activeAero: {
        front: {
          nodes: [{ name: 'FrontActiveFlap', axis: 'x', pivot: { kind: 'node-origin' } }],
          cornerAngleDeg: 0,
          straightAngleDeg: -8,
        },
        rear: {
          nodes: [
            {
              name: 'RearActiveFlap',
              axis: 'x',
              pivot: { kind: 'parent-local-point', point: [0, 0.12, 0] },
            },
          ],
          cornerAngleDeg: 0,
          straightAngleDeg: -10,
        },
      },
    }
    expect(validateCarManifest(production).filter((issue) => issue.severity === 'error')).toEqual([])
  })

  it('measures loaded wheelbase from explicit mappings and rejects bad production scale or missing mapped nodes', () => {
    const root = new THREE.Group()
    const addNode = (name: string, x: number, y: number, z: number, parent = root) => {
      const node = new THREE.Group()
      node.name = name
      node.position.set(x, y, z)
      parent.add(node)
      return node
    }
    addNode('FL', -1, 0, 3.4)
    addNode('FR', 1, 0, 3.4)
    addNode('RL', -1, 0, -3.4)
    addNode('RR', 1, 0, -3.4)
    for (const name of [
      'FrontWing',
      'Nose',
      'FrontSuspension',
      'FrontWheels',
      'Sidepods',
      'Floor',
      'Diffuser',
      'RearSuspension',
      'RearWing',
      'RearWheels',
      'Halo',
      'Cockpit',
      'Bodywork',
    ]) {
      addNode(name, 0, 0, 0)
    }
    addNode('FrontActiveFlap', 0, 0, 0)
    addNode('RearActiveFlap', 0, 0, 0)
    root.updateMatrixWorld(true)

    const base = carManifestForTeam('mclaren')
    const production: CarAssetManifest = {
      ...base,
      accuracy: 'licensed-team-model',
      fallbackForTeam: false,
      wheelNodes: { frontLeft: ['FL'], frontRight: ['FR'], rearLeft: ['RL'], rearRight: ['RR'] },
      wheelRotationAxes: { frontLeft: 'x', frontRight: 'x', rearLeft: 'x', rearRight: 'x' },
      semantics: {
        frontWing: ['FrontWing'],
        nose: ['Nose'],
        frontSuspension: ['FrontSuspension'],
        frontWheels: ['FrontWheels'],
        sidepods: ['Sidepods'],
        floor: ['Floor'],
        diffuser: ['Diffuser'],
        rearSuspension: ['RearSuspension'],
        rearWing: ['RearWing'],
        rearWheels: ['RearWheels'],
        halo: ['Halo'],
        cockpit: ['Cockpit'],
        bodywork: ['Bodywork'],
      },
      activeAero: {
        front: {
          nodes: [{ name: 'FrontActiveFlap', axis: 'x', pivot: { kind: 'node-origin' } }],
          cornerAngleDeg: 0,
          straightAngleDeg: -8,
        },
        rear: {
          nodes: [{ name: 'RearActiveFlap', axis: 'x', pivot: { kind: 'node-origin' } }],
          cornerAngleDeg: 0,
          straightAngleDeg: -10,
        },
      },
      expected: { wheelbaseM: 3.4, maxWidthM: 1.9 },
    }

    expect(measureMappedWheelbaseScene(root, production)).toBeCloseTo(6.8, 6)
    const validBounds = new THREE.Box3(new THREE.Vector3(-1.85, -0.2, -4), new THREE.Vector3(1.85, 1.2, 4))
    expect(validateLoadedCarAsset(root, production, validBounds).filter((issue) => issue.severity === 'error')).toEqual(
      [],
    )

    root.scale.setScalar(1.25)
    root.updateMatrixWorld(true)
    const scaleErrors = validateLoadedCarAsset(root, production, validBounds).filter(
      (issue) => issue.severity === 'error',
    )
    expect(scaleErrors.some((issue) => issue.code === 'loaded-wheelbase-scale')).toBe(true)

    root.scale.setScalar(1)
    root.remove(root.getObjectByName('FrontActiveFlap')!)
    root.updateMatrixWorld(true)
    const nodeErrors = validateLoadedCarAsset(root, production, validBounds).filter(
      (issue) => issue.severity === 'error',
    )
    expect(nodeErrors.some((issue) => issue.code === 'loaded-active-aero-front')).toBe(true)
  })
})

describe('precomputed CFD adapter', () => {
  it('selects exact solved conditions or a compatible speed interpolation bracket', () => {
    const references: CfdDatasetReference[] = [
      {
        id: 'corner-200',
        path: '/cfd/corner-200.json',
        format: 'json-grid-v1',
        conditions: { speedKmh: 200, yawDeg: 0, aeroMode: 'corner' },
        interpolationGroup: 'fixture-corner-zero-yaw',
      },
      {
        id: 'corner-300',
        path: '/cfd/corner-300.json',
        format: 'json-grid-v1',
        conditions: { speedKmh: 300, yawDeg: 0, aeroMode: 'corner' },
        interpolationGroup: 'fixture-corner-zero-yaw',
      },
    ]

    expect(selectCfdDatasetReferences(references, { speedKmh: 200, yawDeg: 0, aeroMode: 'corner' })).toHaveLength(1)
    expect(
      selectCfdDatasetReferences(references, { speedKmh: 250, yawDeg: 0, aeroMode: 'corner' }).map((ref) => ref.id),
    ).toEqual(['corner-200', 'corner-300'])
    expect(selectCfdDatasetReferences(references, { speedKmh: 250, yawDeg: 2, aeroMode: 'corner' })).toEqual([])
    expect(selectCfdDatasetReferences(references, { speedKmh: 250, yawDeg: 0, aeroMode: 'straight' })).toEqual([])
  })

  it('validates and samples a solved grid without NaN or fabricated provider metadata', () => {
    const dataset = syntheticCfdDataset('corner-200', 200, 0.8)
    expect(validatePrecomputedCfdDataset(dataset)).toEqual([])
    const provider = new PrecomputedCfdFieldProvider(dataset)
    const sample = provider.sample(0, 0, 0)
    expect(provider.kind).toBe('precomputed-cfd')
    expect(provider.metadata.datasetIds).toEqual(['corner-200'])
    expect(sample.speedRatio).toBeCloseTo(0.8, 6)
    expect(sample.pressureEstimate).toBeCloseTo(0.2, 6)
    expect(sample.velocity.every(Number.isFinite)).toBe(true)
    expect(Number.isFinite(sample.vorticity)).toBe(true)
    expect(provider.isSolid(-1, -1, -1)).toBe(true)
    expect(provider.isSolid(...provider.projectOutside(-1, -1, -1))).toBe(false)
  })

  it('interpolates only between compatible solved speeds', () => {
    const lower = syntheticCfdDataset('corner-200', 200, 0.8)
    const upper = syntheticCfdDataset('corner-300', 300, 1.2)
    const provider = new PrecomputedCfdFieldProvider([lower, upper], 250)
    const sample = provider.sample(0, 0, 0)
    expect(provider.metadata.speedKmh).toBe(250)
    expect(provider.metadata.datasetIds).toEqual(['corner-200', 'corner-300'])
    expect(sample.speedRatio).toBeCloseTo(1, 6)
    expect(sample.pressureEstimate).toBeCloseTo(0.2, 6)
  })
})

describe('geometry-aware aero provider', () => {
  it('returns a stationary field at zero speed', () => {
    const provider = new GeometryProxyFieldProvider(snapshot, {
      speedKmh: 0,
      yawDeg: 0,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS['High Speed'],
    })
    expect(provider.sample(2, 1, 4)).toMatchObject({
      velocity: [0, 0, 0],
      speedRatio: 0,
      pressureEstimate: 0,
      vorticity: 0,
    })
  })

  it('responds to yaw and active-aero mode without non-finite values', () => {
    const positive = new GeometryProxyFieldProvider(snapshot, {
      speedKmh: 250,
      yawDeg: 6,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS.Cornering,
    })
    const negative = new GeometryProxyFieldProvider(snapshot, {
      speedKmh: 250,
      yawDeg: -6,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS.Cornering,
    })
    expect(positive.sample(2.5, 1, 5).velocity[0]).toBeGreaterThan(0)
    expect(negative.sample(2.5, 1, 5).velocity[0]).toBeLessThan(0)

    const corner = new GeometryProxyFieldProvider(snapshot, {
      speedKmh: 300,
      yawDeg: 0,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS['Dirty Air'],
    })
    const straight = new GeometryProxyFieldProvider(snapshot, {
      speedKmh: 300,
      yawDeg: 0,
      aeroMode: 'straight',
      scenario: FLOW_SCENARIOS['Dirty Air'],
    })
    expect(straight.sample(0, 0.2, -5.2).speedRatio).toBeGreaterThan(corner.sample(0, 0.2, -5.2).speedRatio)

    for (const point of [
      [0, 0.2, -5],
      [1, 1, 0],
      [-2, 0.5, 3],
    ] as const) {
      const sample = corner.sample(...point)
      expect(sample.velocity.every(Number.isFinite)).toBe(true)
      expect(Number.isFinite(sample.speedRatio)).toBe(true)
      expect(sample.speedRatio).toBeGreaterThanOrEqual(0.05)
      expect(sample.speedRatio).toBeLessThanOrEqual(1.38)
    }
  })

  it('preserves scalar left/right symmetry at zero yaw for symmetric geometry', () => {
    const provider = new GeometryProxyFieldProvider(symmetricSnapshot, {
      speedKmh: 250,
      yawDeg: 0,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS['High Speed'],
    })
    const left = provider.sample(-1.3, 0.25, -5.1, 0)
    const right = provider.sample(1.3, 0.25, -5.1, 0)
    expect(left.speedRatio).toBeCloseTo(right.speedRatio, 6)
    expect(left.pressureEstimate).toBeCloseTo(right.pressureEstimate, 6)
    expect(left.vorticity).toBeCloseTo(right.vorticity, 6)
  })

  it('mirrors the lateral velocity component at zero yaw for symmetric geometry', () => {
    const provider = new GeometryProxyFieldProvider(symmetricSnapshot, {
      speedKmh: 250,
      yawDeg: 0,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS['High Speed'],
    })
    const left = provider.sample(-1.3, 0.25, 2.7, 0)
    const right = provider.sample(1.3, 0.25, 2.7, 0)
    expect(left.velocity[0]).toBeCloseTo(-right.velocity[0], 6)
    expect(left.velocity[1]).toBeCloseTo(right.velocity[1], 6)
    expect(left.velocity[2]).toBeCloseTo(right.velocity[2], 6)
  })

  it('projects out of obstacle cells and integrates bounded downstream streamlines', () => {
    const provider = new GeometryProxyFieldProvider(snapshot, {
      speedKmh: 300,
      yawDeg: 0,
      aeroMode: 'corner',
      scenario: FLOW_SCENARIOS['High Speed'],
    })
    expect(provider.isSolid(0, 0.2, 0)).toBe(true)
    const projected = provider.projectOutside(0, 0.2, 0)
    expect(provider.isSolid(...projected)).toBe(false)

    const points = integrateGeometryStreamline(provider, 0.2, 0.1, 3, 58)
    expect(points).toHaveLength(58)
    expect(points.at(-1)!.z).toBeLessThan(points[0].z)
    for (const point of points) {
      expect([point.x, point.y, point.z].every(Number.isFinite)).toBe(true)
      expect(provider.isSolid(point.x, point.y, point.z)).toBe(false)
      expect(point.x).toBeGreaterThanOrEqual(-4.25)
      expect(point.x).toBeLessThanOrEqual(4.25)
      expect(point.y).toBeGreaterThanOrEqual(-0.54)
      expect(point.y).toBeLessThanOrEqual(3.35)
    }
  })
})

describe('state invariants', () => {
  beforeEach(() => {
    useF1Store.setState({
      aerodynamicMode: false,
      compareMode: false,
      windTunnel: false,
      selectedTeamId: 'mclaren',
      selectedDriverId: 'norris',
      compareTeamId: 'ferrari',
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('keeps simulation modes mutually consistent', () => {
    useF1Store.getState().set({ windTunnel: true })
    expect(useF1Store.getState()).toMatchObject({ windTunnel: true, aerodynamicMode: true, compareMode: false })
    useF1Store.getState().set({ compareMode: true })
    expect(useF1Store.getState()).toMatchObject({ compareMode: true, aerodynamicMode: false, windTunnel: false })

    useF1Store.getState().set({ aerodynamicMode: true })
    expect(useF1Store.getState()).toMatchObject({ aerodynamicMode: true, compareMode: false })
    useF1Store.getState().set({ windTunnel: true })
    useF1Store.getState().set({ aerodynamicMode: false })
    expect(useF1Store.getState()).toMatchObject({ aerodynamicMode: false, windTunnel: false })
  })

  it('ignores an invalid team and falls back to a valid team driver', () => {
    useF1Store.getState().selectTeam('not-a-team', 'nobody')
    expect(useF1Store.getState().selectedTeamId).toBe('mclaren')
    useF1Store.getState().selectTeam('ferrari', 'not-a-driver')
    expect(useF1Store.getState().selectedDriverId).toBe('leclerc')
    expect(useF1Store.getState().compareTeamId).not.toBe(useF1Store.getState().selectedTeamId)
  })

  it('still selects a team when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('storage blocked')
      },
    })
    expect(() => useF1Store.getState().selectTeam('ferrari', 'leclerc')).not.toThrow()
    expect(useF1Store.getState().selectedTeamId).toBe('ferrari')
  })
})
