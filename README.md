# F1 2026 Engineering Experience

A React 19 + TypeScript + React Three Fiber vehicle showcase and wind-tunnel visualization focused on a clean production architecture and explicit accuracy/provenance.

## Current accuracy status

The application ships **Formula Reference 26**, an original, detailed Formula-style GLB with curved bodywork, an open cockpit and halo, layered airfoils, suspension, brake hardware, rounded slick tires, and original sidewall lettering. All 11 team presentations share this design with team-color treatments. It is **not** an exact constructor chassis or a verified regulation-compliant car.

The reproducible asset recipe is `scripts/build-reference-car.mjs`. Run `npm run assets:car` to generate all three detail levels: approximately 337k triangles / 8.55 MB for Ultra, 197k / 5.38 MB for High, and 114k / 3.49 MB for Medium/Low. Geometry is indexed and batched into 56 meshes by component and material. The GLBs are authored in metres, with +Y up and +Z forward; the manifest converts them to scene units. Exact constructor realism still requires licensed or independently recreated team assets satisfying [ASSET_REQUIREMENTS.md](./ASSET_REQUIREMENTS.md).

## Architecture

`src/experience/CarScene.tsx` uses one production rendering path: `src/cars/CarModel.tsx`. Car selection is driven by `src/cars/carAssetManifest.ts`; semantic nodes, model scale, material roles, provenance, licensing, expected dimensions, optional LOD/CFD references, and validated active-aero mappings live in the manifest rather than constructor-specific JSX.

`src/cars/assetValidation.ts` rejects incomplete production manifests and reports limitations on fallback assets. Manifest mappings use the original source glTF node names; the runtime mapping layer resolves the names after `GLTFLoader` sanitization so spaces/reserved characters do not create false missing-node failures. Production manifests must provide all four wheel mappings plus an explicitly validated spin axis for each wheel. Front and rear active-aero mappings are per node and carry a parent-local hinge axis, a node-origin or parent-local pivot, and validated Corner/Straight angles; the renderer applies each mapped hinge once and rejects/guards ambiguous mappings. Runtime wheel-axis inference is reserved for the shared fallback. Replacing a fallback with a licensed production model should require a manifest/model update rather than another renderer.

## Aerodynamics

The active fallback provider is a **Geometry-aware realtime approximation**. `GeometryProxyFieldProvider` consumes semantic bounds extracted from the loaded car, applies obstacle-aware sampling, projects paths out of solid proxy cells, and drives the shared streamline/velocity/vorticity/ground-effect views. Streamlines use RK2-style integration through the same provider. The GPU particle path uses deterministic seeding and geometry obstacle uniforms.

This is **not CFD**. No constructor CFD datasets are bundled today. There are no displayed constructor-specific Cd/Cl/load claims. Legitimate reference calculations such as free-stream velocity, dynamic pressure, Reynolds number, and wheel RPM are derived from stated public assumptions.

The CFD runtime boundary is implemented in `PrecomputedCfdFieldProvider` and `cfdDataset.ts`. A manifest may reference validated precomputed regular-grid datasets carrying solver/source, geometry revision, coordinate system, units, speed, yaw, and aero mode. Exact solved conditions are selected directly; compatible datasets in the same interpolation group can be interpolated by speed. If no compatible dataset exists or loading/validation fails, the app remains on the geometry-aware provider. The correct label for an active dataset is “CFD dataset — realtime visualization”, not “Realtime CFD”.

The current pressure layer is an explicitly labelled **relative-pressure estimate** sampled from the geometry-aware provider. It is a qualitative visualization with a legend/provenance and is not surface Cp or CFD pressure data. Provider-backed velocity glyphs, vorticity, wake deficit, center slice, underfloor flow, streamlines, particles, and a flow probe are also available; the probe reports world position, local velocity, V/V∞, relative pressure estimate, relative vorticity, and provider provenance.

## 2026 controls

The UI separates physical/scenario controls from visualization controls and uses **CORNER MODE** and **STRAIGHT MODE** terminology. Physical controls include free-stream speed, explicit yaw, rolling road, and wheel rotation. Visualization controls include particles, streamlines, velocity vectors, relative pressure, vorticity, wake, underfloor flow, center slice, probe, and particle density.

The original reference design contains independently modelled front/rear flaps and explicit axle-aligned hinge pivots. Corner/Straight controls smoothly animate those elements. Their angles demonstrate the concept; they are not constructor mechanism measurements or verified regulation settings. The aero provider responds qualitatively.

Rolling-road speed and wheel angular velocity are derived from free-stream speed. At 0 km/h, free-stream dynamic pressure, wheel RPM, rolling-road motion, and the sampled aero field go to zero. Each wheel has an explicit X-axis pivot, so tire, cover and lettering rotate together while the brake caliper stays fixed. Legacy bounds-based inference remains available for older assets without declared axes.

## Running and verification

```bash
npm install
npm run dev
```

Professional checks:

```bash
npm run typecheck
npm run test
npm run lint
npm run format:check
npm run build
npm run verify
```

`npm run verify` runs type checking, tests, lint, and the production build.

## Rendering

The car loader supports GLTF/DRACO/KTX2, normalizes scale, clones resources, selects quality-specific geometry, and supplies semantic bounds to the aero provider. Team-color changes reuse the loaded geometry. GPU resources are disposed after the old primitive leaves the scene. Wheel bounds lead the bounded GPU obstacle list so material batching cannot displace them.

The scene uses AgX tone mapping in both the direct renderer and the HDR post-processing path, sRGB output, neutral studio softboxes, a local HDR environment, soft contact shadows, blurred floor reflections, and adaptive DPR. Dielectric clearcoat paint, woven carbon micro-normals, rubber grain, dark wheel covers, exposed metal, and tire markings have separate finishes. Manual orbit is retained after a camera transition, and whole-car framing adapts to portrait viewports. High/Ultra enable reflections and post-processing; Medium/Low use a simpler floor and the lighter asset. Stable 60 FPS on every device is not claimed.

The reference remains a procedural design study. True close-up photorealism still benefits from authored UV/PBR textures, more detailed mechanical interiors, and constructor-accurate licensed geometry. No CFD dataset is bundled.

## Licensing

Active reference geometry: original project-authored work dedicated under CC0 1.0. Lettering uses the Helvetiker font included with Three.js; the MAGENTA font notice is retained in `public/assets/cars/reference-26/LICENSE.txt`.

The older, unused base car remains in the repository: “basic Lowpoly F1 Car V1” by arthihalder, CC BY 4.0. Its attribution is retained in `public/assets/cars/base/LICENSE.txt`.

Only add replacement models, logos, sponsor artwork, photography, or textures when the project has the rights required for redistribution. Official imagery can be used as visual reference without assuming redistribution rights.

This is an unofficial visualization project and is not affiliated with or endorsed by Formula 1, the FIA, or any constructor.
