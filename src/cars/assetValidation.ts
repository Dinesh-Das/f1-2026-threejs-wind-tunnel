import type { CarAssetManifest, CarSemanticComponent } from './carAssetManifest'
import type { WheelPosition } from './carAssetManifest'
import { mappedNodeNameMatches } from './nodeMapping'

export type AssetValidationIssue = {
  severity: 'error' | 'warning'
  code: string
  message: string
}

const REQUIRED_PRODUCTION_SEMANTICS: CarSemanticComponent[] = [
  'frontWing',
  'nose',
  'frontSuspension',
  'frontWheels',
  'sidepods',
  'floor',
  'diffuser',
  'rearSuspension',
  'rearWing',
  'rearWheels',
  'halo',
  'cockpit',
  'bodywork',
]

const WHEEL_POSITIONS: WheelPosition[] = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']

export function validateCarManifest(manifest: CarAssetManifest): AssetValidationIssue[] {
  const issues: AssetValidationIssue[] = []
  if (!manifest.modelPath) issues.push({ severity: 'error', code: 'model-path', message: 'Model path is required.' })
  if (!manifest.source.url)
    issues.push({ severity: 'error', code: 'source', message: 'Asset provenance URL is required.' })
  if (!manifest.license.name)
    issues.push({ severity: 'error', code: 'license', message: 'Asset licence metadata is required.' })
  if (!Number.isFinite(manifest.worldScale) || manifest.worldScale <= 0) {
    issues.push({ severity: 'error', code: 'world-scale', message: 'World scale must be a finite positive number.' })
  }
  if (
    (manifest.axes.up === '+Z' && (manifest.axes.forward === '+Z' || manifest.axes.forward === '-Z')) ||
    !manifest.axes.forward
  ) {
    issues.push({
      severity: 'error',
      code: 'axes',
      message: 'Forward and up axes must describe a valid non-parallel source coordinate system.',
    })
  }
  if (manifest.expected.wheelbaseM < 3 || manifest.expected.wheelbaseM > 3.5) {
    issues.push({
      severity: 'error',
      code: 'wheelbase',
      message: `Expected wheelbase ${manifest.expected.wheelbaseM} m is outside the supported 2026 envelope.`,
    })
  }
  if (manifest.expected.maxWidthM <= 0 || manifest.expected.maxWidthM > 1.9) {
    issues.push({
      severity: 'error',
      code: 'width',
      message: `Expected width ${manifest.expected.maxWidthM} m is invalid.`,
    })
  }

  if (manifest.accuracy === 'licensed-team-model' || manifest.accuracy === 'high-detail-reference-recreation') {
    for (const semantic of REQUIRED_PRODUCTION_SEMANTICS) {
      if (!manifest.semantics[semantic]?.length) {
        issues.push({
          severity: 'error',
          code: `semantic-${semantic}`,
          message: `Production asset is missing ${semantic} node mappings.`,
        })
      }
    }
    if (!manifest.activeAero.front || !manifest.activeAero.rear) {
      issues.push({
        severity: 'error',
        code: 'active-aero',
        message: 'Production asset is missing front/rear active-aero hinge mappings.',
      })
    } else {
      for (const [system, mapping] of [
        ['front', manifest.activeAero.front],
        ['rear', manifest.activeAero.rear],
      ] as const) {
        if (!mapping.nodes.length) {
          issues.push({
            severity: 'error',
            code: `active-aero-${system}-nodes`,
            message: `Production asset has no ${system} active-aero node mappings.`,
          })
        }
        if (![mapping.cornerAngleDeg, mapping.straightAngleDeg].every(Number.isFinite)) {
          issues.push({
            severity: 'error',
            code: `active-aero-${system}-angles`,
            message: `Production ${system} active-aero Corner/Straight angles must be finite.`,
          })
        }
        const mappedNames = new Set<string>()
        for (const node of mapping.nodes) {
          if (!node.name.trim()) {
            issues.push({
              severity: 'error',
              code: `active-aero-${system}-node-name`,
              message: `Production ${system} active-aero mapping contains an empty node name.`,
            })
          }
          if (mappedNames.has(node.name)) {
            issues.push({
              severity: 'error',
              code: `active-aero-${system}-duplicate-node`,
              message: `Production ${system} active-aero node ${node.name} is mapped more than once.`,
            })
          }
          mappedNames.add(node.name)
          if (node.pivot.kind === 'parent-local-point' && !node.pivot.point.every(Number.isFinite)) {
            issues.push({
              severity: 'error',
              code: `active-aero-${system}-pivot`,
              message: `Production ${system} active-aero pivot for ${node.name || '<unnamed>'} must be finite.`,
            })
          }
        }
      }
      const frontNames = new Set(manifest.activeAero.front.nodes.map((node) => node.name))
      for (const node of manifest.activeAero.rear.nodes) {
        if (frontNames.has(node.name)) {
          issues.push({
            severity: 'error',
            code: 'active-aero-cross-system-node',
            message: `Active-aero node ${node.name} cannot belong to both front and rear systems.`,
          })
        }
      }
    }
    for (const wheel of WHEEL_POSITIONS) {
      if (!manifest.wheelNodes[wheel]?.length) {
        issues.push({
          severity: 'error',
          code: `wheel-node-${wheel}`,
          message: `Production asset is missing ${wheel} wheel node mappings.`,
        })
      }
      if (!manifest.wheelRotationAxes?.[wheel]) {
        issues.push({
          severity: 'error',
          code: `wheel-axis-${wheel}`,
          message: `Production asset is missing a validated ${wheel} wheel rotation axis.`,
        })
      }
    }
  } else if (!manifest.activeAero.front || !manifest.activeAero.rear) {
    issues.push({
      severity: 'warning',
      code: 'active-aero',
      message: 'Fallback asset does not contain validated 2026 active-aero flap geometry.',
    })
  }

  if (manifest.fallbackForTeam && WHEEL_POSITIONS.some((wheel) => !manifest.wheelRotationAxes?.[wheel])) {
    issues.push({
      severity: 'warning',
      code: 'wheel-axis',
      message:
        'Fallback asset omits validated wheel rotation axes; runtime inference is used only for this reference geometry.',
    })
  }

  return issues
}

export function findMappedSemantic(nodeName: string, manifest: CarAssetManifest): CarSemanticComponent | null {
  for (const [semantic, names] of Object.entries(manifest.semantics) as Array<[CarSemanticComponent, string[]]>) {
    if (names.some((candidate) => mappedNodeNameMatches(nodeName, candidate))) return semantic
  }
  return null
}
