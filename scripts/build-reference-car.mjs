// Original, reproducible Formula-style reference geometry. Coordinates are metres,
// +Y up, +Z forward. This is a design study, not a constructor CAD reconstruction.
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (process.argv.includes('--all')) {
  for (const level of ['hero', 'standard', 'performance']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--lod=${level}`], { stdio: 'inherit' })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
  process.exit(0)
}
const lod = process.argv.find((arg) => arg.startsWith('--lod='))?.split('=')[1] ?? 'hero'
if (!['hero', 'standard', 'performance'].includes(lod)) throw new Error(`Unknown LOD: ${lod}`)
const detailScale = lod === 'performance' ? 0.45 : lod === 'standard' ? 0.7 : 1
const detail = (value, minimum = 8) => Math.max(minimum, Math.round(value * detailScale))

// GLTFExporter only needs the asynchronous blob-reading part of FileReader here.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer()
    this.onloadend?.()
  }
}

const font = new FontLoader().parse(
  JSON.parse(
    await readFile(
      new URL('../node_modules/three/examples/fonts/helvetiker_bold.typeface.json', import.meta.url),
      'utf8',
    ),
  ),
)
const root = new THREE.Group()
root.name = 'Formula_Reference_26'
const materials = Object.fromEntries(
  [
    ['body', '#ff8000'],
    ['secondary', '#171a1c'],
    ['accent', '#e1e4e4'],
    ['carbon', '#151719'],
    ['tire', '#252628'],
    ['rim', '#36383b'],
    ['metal', '#a5a8ab'],
    ['marking', '#d2bd77'],
    ['interior', '#151719'],
    ['glass', '#151e23'],
  ].map(([role, color]) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: role === 'tire' ? 0.84 : 0.35,
      metalness: role === 'metal' ? 0.95 : 0,
    })
    material.name = role
    material.userData.f1Role = role
    return [role, material]
  }),
)

function part(name, parent = root, position = [0, 0, 0]) {
  const group = new THREE.Group()
  group.name = name
  group.position.fromArray(position)
  group.userData.batches = {}
  parent.add(group)
  return group
}

function add(group, geometry, role = 'carbon', position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  )
  geometry.applyMatrix4(matrix)
  const batches = group.userData.batches
  ;(batches[role] ??= []).push(geometry)
}

function box(group, size, pos, role = 'carbon', rotation = [0, 0, 0]) {
  add(group, new THREE.BoxGeometry(...size), role, pos, rotation)
}

function tube(group, points, radius, role = 'carbon', segments = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  add(group, new THREE.TubeGeometry(curve, detail(segments), radius, detail(12), false), role)
}

function rod(group, a, b, radius = 0.015, role = 'carbon') {
  const start = new THREE.Vector3(...a)
  const end = new THREE.Vector3(...b)
  const geometry = new THREE.CylinderGeometry(radius * 0.8, radius, start.distanceTo(end), 12)
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()),
  )
  add(group, geometry, role, start.add(end).multiplyScalar(0.5).toArray())
}

// Smooth loft with elliptical/superelliptical sections; continuous normals and UVs.
function loft(
  group,
  sections,
  role,
  exponent = 2.5,
  radial = 64,
  longitudinal = 80,
  angleStart = 0,
  angleLength = Math.PI * 2,
) {
  radial = detail(radial, 12)
  longitudinal = detail(longitudinal, 4)
  const curves = [0, 1, 3, 4].map(
    (column) => new THREE.SplineCurve(sections.map((s) => new THREE.Vector2(s[2], s[column]))),
  )
  const positions = [],
    uv = [],
    indices = []
  for (let j = 0; j <= longitudinal; j++) {
    const t = j / longitudinal
    const coords = curves.map((curve) => curve.getPoint(t))
    const z = coords[0].x
    const [cx, cy, width, height] = coords.map((c) => c.y)
    for (let i = 0; i <= radial; i++) {
      const a = angleStart + (i / radial) * angleLength
      const c = Math.cos(a),
        s = Math.sin(a)
      positions.push(
        cx + Math.sign(c) * Math.abs(c) ** (2 / exponent) * Math.max(0.001, width),
        cy + Math.sign(s) * Math.abs(s) ** (2 / exponent) * Math.max(0.001, height),
        z,
      )
      uv.push(i / radial, t)
      if (j < longitudinal && i < radial) {
        const k = j * (radial + 1) + i
        indices.push(k, k + radial + 1, k + 1, k + 1, k + radial + 1, k + radial + 2)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  add(group, geometry, role)
  if (Math.abs(angleLength - Math.PI * 2) < 0.001) {
    for (const end of [0, 1]) {
      const section = sections[end ? sections.length - 1 : 0]
      const start = (end ? longitudinal : 0) * (radial + 1) * 3
      const capPositions = [section[0], section[1], section[2], ...positions.slice(start, start + (radial + 1) * 3)]
      const capUvs = [0.5, 0.5]
      const capIndices = []
      const facing = Math.sign(sections[0][2] - sections.at(-1)[2]) * (end ? -1 : 1)
      for (let i = 0; i <= radial; i++) {
        capUvs.push(
          0.5 + (capPositions[(i + 1) * 3] - section[0]) / (section[3] * 2),
          0.5 + (capPositions[(i + 1) * 3 + 1] - section[1]) / (section[4] * 2),
        )
        if (i < radial) capIndices.push(0, facing > 0 ? i + 1 : i + 2, facing > 0 ? i + 2 : i + 1)
      }
      const cap = new THREE.BufferGeometry()
      cap.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3))
      cap.setAttribute('uv', new THREE.Float32BufferAttribute(capUvs, 2))
      cap.setIndex(capIndices)
      cap.computeVertexNormals()
      add(group, cap, role)
    }
  }
}

function plate(group, outline, depth, pos, role, rotation = [0, 0, 0]) {
  const shape = new THREE.Shape()
  outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    curveSegments: 24,
  })
  geo.translate(0, 0, -depth / 2)
  add(group, geo, role, pos, rotation)
}

function ring(group, radius, thickness, pos, role, rotation = [0, Math.PI / 2, 0], radial = 128) {
  add(group, new THREE.TorusGeometry(radius, thickness, 8, detail(radial, 32)), role, pos, rotation)
}

function text(group, copy, size, pos, role = 'accent', rotation = [0, 0, 0]) {
  const geo = new TextGeometry(copy, { font, size, depth: 0.0006, curveSegments: 3, bevelEnabled: false })
  geo.computeBoundingBox()
  geo.translate(-(geo.boundingBox.max.x - geo.boundingBox.min.x) / 2, 0, 0)
  add(group, geo, role, pos, rotation)
}

function airfoil(group, span, chord, pos, role, sweep = 0, bend = 0, angle = 0) {
  const positions = [],
    uvs = [],
    indices = []
  const nx = detail(72, 32),
    np = detail(64, 32)
  for (let i = 0; i <= nx; i++) {
    const x = (i / nx - 0.5) * span
    const fraction = Math.abs(x) / (span / 2)
    const localChord = chord * (1 - fraction * 0.14)
    for (let j = 0; j <= np; j++) {
      const theta = (j / np) * Math.PI * 2
      const u = (1 - Math.cos(theta)) * 0.5
      const thick =
        5 *
        0.095 *
        localChord *
        (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1036 * u ** 4)
      const camber = -0.065 * localChord * Math.sin(Math.PI * u)
      positions.push(
        x,
        camber + (j < np / 2 ? thick : -thick) + bend * fraction ** 2 + (u - 0.5) * localChord * angle,
        (u - 0.5) * localChord + sweep * fraction ** 2,
      )
      uvs.push(i / nx, j / np)
      if (i < nx && j < np) {
        const k = i * (np + 1) + j
        indices.push(k, k + 1, k + np + 1, k + 1, k + np + 2, k + np + 1)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  add(group, geo, role, pos)
}

const floor = part('Floor')
plate(
  floor,
  [
    [-0.76, -2.05],
    [-0.8, -1.1],
    [-0.75, 0.3],
    [-0.6, 0.95],
    [-0.3, 1.15],
    [0.3, 1.15],
    [0.6, 0.95],
    [0.75, 0.3],
    [0.8, -1.1],
    [0.76, -2.05],
  ],
  0.025,
  [0, 0.065, 0],
  'carbon',
  [Math.PI / 2, 0, 0],
)
for (const side of [-1, 1]) {
  tube(
    floor,
    [
      [side * 0.78, 0.07, -1.7],
      [side * 0.78, 0.09, -0.7],
      [side * 0.74, 0.1, 0.2],
      [side * 0.58, 0.14, 0.95],
    ],
    0.012,
  )
  for (let i = 0; i < 3; i++)
    plate(
      floor,
      [
        [-0.24, 0.0],
        [0.22, 0.0],
        [0.18, 0.12],
        [-0.2, 0.1],
      ],
      0.008,
      [side * (0.5 + i * 0.1), 0.085, 0.55],
      'carbon',
      [0, Math.PI / 2, 0],
    )
}
const diffuser = part('Diffuser')
box(diffuser, [1.35, 0.016, 0.58], [0, 0.135, -1.97], 'carbon', [0.22, 0, 0])
for (const x of [-0.65, -0.4, -0.2, 0, 0.2, 0.4, 0.65])
  plate(
    diffuser,
    [
      [-0.33, 0],
      [0.32, 0],
      [0.32, 0.05],
      [-0.33, 0.23],
    ],
    0.009,
    [x, 0.075, -1.98],
    'carbon',
    [0, Math.PI / 2, 0],
  )

const nose = part('Nose')
loft(
  nose,
  [
    [0, 0.27, 2.57, 0.065, 0.035],
    [0, 0.28, 2.35, 0.105, 0.065],
    [0, 0.35, 1.85, 0.14, 0.09],
    [0, 0.46, 1.3, 0.19, 0.12],
    [0, 0.47, 0.85, 0.26, 0.16],
  ],
  'body',
  3,
)
const chassis = part('Bodywork')
loft(
  chassis,
  [
    [0, 0.22, 1.1, 0.22, 0.1],
    [0, 0.25, 0.7, 0.32, 0.17],
    [0, 0.25, 0, 0.34, 0.18],
    [0, 0.22, -0.6, 0.3, 0.14],
    [0, 0.17, -1.5, 0.21, 0.09],
    [0, 0.16, -2.1, 0.11, 0.05],
  ],
  'secondary',
  3,
)
loft(
  chassis,
  [
    [0, 0.53, -0.42, 0.23, 0.27],
    [0, 0.59, -0.7, 0.26, 0.31],
    [0, 0.43, -1.1, 0.23, 0.19],
    [0, 0.31, -1.55, 0.15, 0.12],
    [0, 0.23, -1.95, 0.075, 0.07],
  ],
  'body',
  2.1,
)
plate(
  chassis,
  [
    [-0.65, 0],
    [0.55, 0],
    [0.5, 0.12],
    [-0.45, 0.2],
  ],
  0.018,
  [0, 0.6, -1.15],
  'body',
  [0, Math.PI / 2, 0],
)
loft(
  chassis,
  [
    [0, 0.8, -0.48, 0.06, 0.01],
    [0, 0.89, -0.64, 0.07, 0.015],
    [0, 0.68, -0.96, 0.055, 0.01],
    [0, 0.47, -1.25, 0.03, 0.006],
  ],
  'secondary',
  2,
)

const cockpit = part('Cockpit')
// Close the engine fairing behind the cockpit; the intake above remains open.
add(
  chassis,
  new THREE.SphereGeometry(1, detail(48, 24), detail(24, 12)),
  'body',
  [0, 0.53, -0.43],
  [0, 0, 0],
  [0.23, 0.27, 0.035],
)
box(cockpit, [0.28, 0.19, 0.045], [0, 0.57, -0.38], 'interior', [-0.1, 0, 0])
for (const side of [-1, 1]) {
  loft(
    cockpit,
    [
      [side * 0.21, 0.5, 0.91, 0.06, 0.09],
      [side * 0.29, 0.52, 0.6, 0.055, 0.1],
      [side * 0.3, 0.52, 0.1, 0.06, 0.095],
      [side * 0.26, 0.53, -0.32, 0.07, 0.1],
    ],
    'body',
    2.6,
    32,
    48,
  )
}
loft(
  cockpit,
  [
    [0, 0.49, 0.94, 0.25, 0.085],
    [0, 0.52, 0.73, 0.27, 0.06],
    [0, 0.48, 0.6, 0.26, 0.03],
  ],
  'body',
  3,
  48,
  28,
)
const rimPoints = Array.from({ length: 81 }, (_, i) => {
  const t = (i / 80) * Math.PI * 2
  return [0.255 * Math.cos(t), 0.56 + 0.025 * Math.cos(t), 0.14 + 0.49 * Math.sin(t)]
})
tube(cockpit, rimPoints, 0.023, 'carbon', 120)
loft(
  cockpit,
  [
    [0, 0.31, 0.6, 0.22, 0.01],
    [0, 0.25, 0.2, 0.24, 0.01],
    [0, 0.3, -0.26, 0.2, 0.01],
  ],
  'interior',
  2,
)
box(cockpit, [0.33, 0.28, 0.045], [0, 0.39, -0.28], 'interior', [-0.24, 0, 0])
for (const x of [-0.072, 0.072]) box(cockpit, [0.036, 0.26, 0.009], [x, 0.42, -0.245], 'accent', [-0.24, 0, 0])
box(cockpit, [0.25, 0.045, 0.055], [0, 0.47, 0.43], 'carbon')
box(cockpit, [0.15, 0.083, 0.018], [0, 0.49, 0.44], 'glass', [-0.1, 0, 0])
for (const side of [-1, 1]) {
  tube(
    cockpit,
    [
      [side * 0.11, 0.46, 0.43],
      [side * 0.14, 0.45, 0.43],
      [side * 0.14, 0.39, 0.43],
      [side * 0.09, 0.38, 0.43],
    ],
    0.012,
    'interior',
    16,
  )
  for (let i = 0; i < 3; i++)
    add(cockpit, new THREE.SphereGeometry(0.008, 8, 6), 'marking', [side * (0.085 + i * 0.02), 0.46, 0.475])
}
const halo = part('Halo')
add(halo, new THREE.CircleGeometry(1, 48), 'interior', [0, 0.85, -0.338], [0, 0, 0], [0.085, 0.038, 1])
tube(
  halo,
  [
    [-0.27, 0.57, -0.31],
    [-0.28, 0.75, -0.15],
    [-0.22, 0.81, 0.36],
    [0, 0.79, 0.67],
    [0.22, 0.81, 0.36],
    [0.28, 0.75, -0.15],
    [0.27, 0.57, -0.31],
  ],
  0.028,
  'carbon',
  100,
)
rod(halo, [0, 0.79, 0.67], [0, 0.51, 0.76], 0.023)
loft(
  halo,
  [
    [0, 0.85, -0.34, 0.11, 0.055],
    [0, 1.01, -0.48, 0.09, 0.09],
    [0, 0.95, -0.63, 0.1, 0.08],
  ],
  'body',
  2,
  32,
  32,
)
loft(
  halo,
  [
    [0, 0.9, -0.32, 0.071, 0.035],
    [0, 0.97, -0.43, 0.06, 0.043],
    [0, 0.92, -0.51, 0.065, 0.04],
  ],
  'interior',
  2,
  24,
  20,
)
rod(halo, [0, 1.02, -0.5], [0, 1.1, -0.5], 0.012)
box(halo, [0.18, 0.045, 0.07], [0, 1.1, -0.5], 'secondary')

const sidepods = part('Sidepods')
for (const side of [-1, 1]) {
  const sections = [
    [side * 0.5, 0.37, 0.55, 0.17, 0.11],
    [side * 0.54, 0.39, 0.36, 0.2, 0.14],
    [side * 0.55, 0.34, -0.05, 0.21, 0.14],
    [side * 0.51, 0.27, -0.6, 0.18, 0.11],
    [side * 0.43, 0.21, -1.16, 0.13, 0.075],
    [side * 0.31, 0.18, -1.55, 0.075, 0.045],
  ]
  loft(sidepods, sections, 'body', 3.3, 64, 88)
  loft(
    sidepods,
    sections.map(([x, y, z, w, h]) => [x, y + 0.003, z, w + 0.002, h + 0.004]),
    'secondary',
    3.3,
    12,
    64,
    Math.PI * 0.1,
    Math.PI * 0.8,
  )
  loft(
    sidepods,
    [
      [side * 0.5, 0.37, 0.566, 0.125, 0.074],
      [side * 0.5, 0.37, 0.54, 0.125, 0.074],
    ],
    'interior',
    3,
    48,
    4,
  )
  ring(sidepods, 0.04, 0.006, [side * 0.56, 0.36, 0.57], 'carbon', [0, 0, 0], 32)
  // Cooling louvres are narrow recessed slots on the engine shoulder.
  for (let i = 0; i < 9; i++)
    box(sidepods, [0.16, 0.006, 0.014], [side * (0.4 - i * 0.009), 0.455 - i * 0.017, -0.38 - i * 0.075], 'carbon', [
      0.18,
      side * 0.24,
      0,
    ])
  rod(sidepods, [side * 0.27, 0.5, 0.7], [side * 0.57, 0.63, 0.67], 0.009)
  add(sidepods, new RoundedBoxGeometry(0.16, 0.07, 0.07, 3, 0.012), 'body', [side * 0.58, 0.64, 0.67])
  box(sidepods, [0.13, 0.048, 0.003], [side * 0.58, 0.64, 0.63], 'glass')
  text(sidepods, '26', 0.12, [side * 0.759, 0.32, -0.2], 'accent', [0, (side * Math.PI) / 2, 0])
}
text(nose, '26', 0.15, [0, 0.465, 1.62], 'secondary', [-Math.PI / 2, 0, Math.PI])

const frontWing = part('FrontWing')
airfoil(frontWing, 1.84, 0.27, [0, 0.125, 2.47], 'body', -0.12, 0.055, -0.12)
airfoil(frontWing, 1.8, 0.17, [0, 0.185, 2.28], 'carbon', -0.09, 0.065, -0.28)
const frontFlap = part('FrontFlap', frontWing, [0, 0.22, 2.19])
airfoil(frontFlap, 1.74, 0.16, [0, 0, 0], 'body', -0.06, 0.07, -0.4)
for (const side of [-1, 1]) {
  plate(
    frontWing,
    [
      [-0.24, 0],
      [0.22, 0],
      [0.19, 0.2],
      [-0.18, 0.23],
    ],
    0.016,
    [side * 0.91, 0.09, 2.4],
    'secondary',
    [0, Math.PI / 2, 0],
  )
  rod(frontWing, [side * 0.08, 0.27, 2.46], [side * 0.1, 0.14, 2.47], 0.012)
  for (let i = 0; i < 3; i++)
    box(frontWing, [0.012, 0.065, 0.035], [side * (0.37 + i * 0.22), 0.19, 2.26], 'carbon', [0.25, 0, 0])
}

const rearWing = part('RearWing')
airfoil(rearWing, 1.53, 0.3, [0, 0.87, -2.06], 'body', 0.055, -0.06, 0.18)
const rearFlap = part('RearFlap', rearWing, [0, 0.97, -2.18])
airfoil(rearFlap, 1.5, 0.22, [0, 0, 0], 'secondary', 0.035, -0.035, 0.65)
for (const side of [-1, 1]) {
  plate(
    rearWing,
    [
      [-0.27, 0],
      [0.25, 0],
      [0.22, 0.32],
      [-0.22, 0.3],
    ],
    0.014,
    [side * 0.77, 0.7, -2.1],
    'body',
    [0, Math.PI / 2, 0],
  )
  tube(
    rearWing,
    [
      [side * 0.18, 0.25, -1.85],
      [side * 0.2, 0.65, -1.98],
      [side * 0.27, 0.83, -2.08],
    ],
    0.018,
  )
}
airfoil(rearWing, 0.87, 0.14, [0, 0.35, -2.12], 'carbon', 0, 0, 0.2)
box(rearWing, [0.1, 0.1, 0.035], [0, 0.32, -2.3], 'interior')
for (let i = 0; i < 3; i++) box(rearWing, [0.065, 0.008, 0.004], [0, 0.29 + i * 0.025, -2.322], 'marking')
const exhaust = part('Exhaust', chassis)
ring(exhaust, 0.044, 0.008, [0, 0.4, -1.98], 'metal', [0, 0, 0], 48)
loft(
  exhaust,
  [
    [0, 0.4, -2.04, 0.035, 0.035],
    [0, 0.4, -1.78, 0.038, 0.038],
  ],
  'metal',
  2,
  32,
  16,
)

for (const [axle, z, y, width, track] of [
  ['Front', 1.7, 0.3525, 0.28, 0.8],
  ['Rear', -1.7, 0.355, 0.375, 0.74],
]) {
  const suspension = part(`${axle}Suspension`)
  for (const side of [-1, 1]) {
    for (const height of [0.2, 0.43]) {
      rod(suspension, [side * 0.22, height, z - 0.34], [side * (track - 0.09), height + 0.015, z], 0.014)
      rod(suspension, [side * 0.22, height, z + 0.3], [side * (track - 0.09), height + 0.015, z], 0.014)
    }
    rod(suspension, [side * 0.24, 0.54, z - 0.12], [side * (track - 0.08), 0.2, z], 0.016)
    rod(suspension, [side * 0.24, 0.28, z - 0.2], [side * (track - 0.08), 0.29, z - 0.045], 0.009, 'metal')
    if (axle === 'Rear') rod(suspension, [0, 0.26, z], [side * (track - 0.05), 0.31, z], 0.023, 'metal')
    const wheel = part(`${axle}${side < 0 ? 'Left' : 'Right'}Wheel`, root, [side * track, y, z])
    const radius = axle === 'Front' ? 0.3525 : 0.355
    // Lathed tire profile includes shoulders, sidewall bulge, bead and an open hub.
    const profile = [
      [0.225, -width * 0.48],
      [0.245, -width * 0.51],
      [radius * 0.88, -width * 0.52],
      [radius * 0.96, -width * 0.44],
      [radius * 0.995, -width * 0.31],
      [radius, -width * 0.18],
      [radius, width * 0.18],
      [radius * 0.995, width * 0.31],
      [radius * 0.96, width * 0.44],
      [radius * 0.88, width * 0.52],
      [0.245, width * 0.51],
      [0.225, width * 0.48],
    ]
    const curve = new THREE.SplineCurve(profile.map((p) => new THREE.Vector2(...p)))
    const tyre = new THREE.LatheGeometry(curve.getPoints(detail(64, 24)), detail(144, 64))
    tyre.rotateZ(Math.PI / 2)
    add(wheel, tyre, 'tire')
    for (const face of [-1, 1]) {
      const outerX = face * width * 0.502
      ring(wheel, 0.302, 0.0024, [outerX, 0, 0], 'marking')
      ring(wheel, 0.265, 0.0008, [outerX + 0.001 * face, 0, 0], 'tire')
      ring(wheel, 0.232, 0.007, [face * width * 0.46, 0, 0], 'metal')
      const disk = new THREE.CylinderGeometry(0.223, 0.223, 0.008, 96)
      disk.rotateZ(Math.PI / 2)
      add(wheel, disk, 'rim', [face * (width * 0.46 - 0.006), 0, 0])
      ring(wheel, 0.191, 0.0016, [face * width * 0.47, 0, 0], 'metal')
      ring(wheel, 0.06, 0.005, [face * (width * 0.48 + 0.004), 0, 0], 'metal', undefined, 64)
      const nut = new THREE.CylinderGeometry(0.028, 0.028, 0.023, 6)
      nut.rotateZ(Math.PI / 2)
      add(wheel, nut, 'metal', [face * width * 0.49, 0, 0])
      // Concise original sidewall markings, without vendor logos.
      text(wheel, 'SOFT', 0.035, [face * width * 0.528, 0.266, 0], 'marking', [0, (face * Math.PI) / 2, 0])
      text(wheel, 'FORMULA 26', 0.018, [face * width * 0.528, -0.285, 0], 'marking', [0, (face * Math.PI) / 2, Math.PI])
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        const vent = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8)
        vent.rotateZ(Math.PI / 2)
        add(wheel, vent, 'carbon', [face * width * 0.475, Math.sin(a) * 0.173, Math.cos(a) * 0.173])
      }
    }
    // Brake disc/caliper and upright remain attached to the suspension, not the spinning wheel.
    const disc = new THREE.CylinderGeometry(0.155, 0.155, 0.018, 64)
    disc.rotateZ(Math.PI / 2)
    add(suspension, disc, 'metal', [side * (track - width * 0.36), y, z])
    box(suspension, [0.065, 0.15, 0.07], [side * (track - width * 0.35), y, z - 0.135], 'carbon')
  }
}

// Merge by semantic group/material. Detail does not imply one draw call per bolt.
let triangles = 0,
  meshes = 0
root.traverse((group) => {
  if (!group.userData.batches) return
  for (const [role, geometries] of Object.entries(group.userData.batches)) {
    const normalized = geometries.map((g) => {
      const flat = g.index ? g.toNonIndexed() : g
      for (const key of Object.keys(flat.attributes))
        if (!['position', 'normal', 'uv'].includes(key)) flat.deleteAttribute(key)
      return flat
    })
    const merged = mergeVertices(mergeGeometries(normalized, false), 0.000001)
    merged.normalizeNormals()
    const normals = merged.getAttribute('normal')
    for (let i = 0; i < normals.count; i++) {
      // Degenerate seam vertices at airfoil tips/glyph outlines have no face
      // area. Give those a finite unit normal for a clean glTF export.
      if (normals.getX(i) ** 2 + normals.getY(i) ** 2 + normals.getZ(i) ** 2 < 0.5) normals.setXYZ(i, 0, 1, 0)
    }
    merged.computeBoundingBox()
    merged.computeBoundingSphere()
    const mesh = new THREE.Mesh(merged, materials[role])
    mesh.name = `${group.name}_${role}`
    group.add(mesh)
    triangles += (merged.index?.count ?? merged.attributes.position.count) / 3
    meshes++
  }
  delete group.userData.batches
})
root.updateMatrixWorld(true)
const output = new URL('../public/assets/cars/reference-26/', import.meta.url)
await mkdir(output, { recursive: true })
const binary = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true })
const filename = lod === 'hero' ? 'reference-26.glb' : `reference-26-${lod}.glb`
await writeFile(new URL(filename, output), Buffer.from(binary))
await writeFile(
  new URL(lod === 'hero' ? 'asset-info.json' : `asset-info-${lod}.json`, output),
  JSON.stringify(
    {
      title: 'Formula Reference 26',
      lod,
      revision: 'original-reference-v1',
      units: 'metre',
      forward: '+Z',
      up: '+Y',
      wheelbaseM: 3.4,
      triangles,
      meshes,
      bytes: binary.byteLength,
      description:
        'Original Formula-style design study. Shared geometry with team-color treatments; not constructor CAD or a verified regulation-compliant car.',
    },
    null,
    2,
  ) + '\n',
)
const fontLicense = await readFile(new URL('../node_modules/three/examples/fonts/LICENSE', import.meta.url), 'utf8')
await writeFile(
  new URL('LICENSE.txt', output),
  'Formula Reference 26\n\nOriginal project-authored vehicle geometry generated by scripts/build-reference-car.mjs.\nThis original geometry is dedicated to the public domain under CC0 1.0:\nhttps://creativecommons.org/publicdomain/zero/1.0/\n\nThe model is an independent Formula-style design study, not constructor CAD.\nNo sponsor logos or third-party vehicle meshes are included.\n\nLettering geometry uses the Helvetiker typeface bundled with Three.js.\nIts font license is retained below:\n\n' +
    fontLicense,
)
console.log(JSON.stringify({ lod, triangles, meshes, megabytes: (binary.byteLength / 1e6).toFixed(2) }))
