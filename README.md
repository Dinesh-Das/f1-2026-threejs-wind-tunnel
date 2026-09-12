# F1 2026 Engineering Experience

A React 19 + TypeScript + React Three Fiber vehicle showcase and wind-tunnel visualization focused on a clean production architecture and explicit accuracy/provenance.

## Current accuracy status

The repository currently ships one shared third-party low-poly Formula-style glTF for all 11 team presentations. It is **not** an exact 2026 McLaren, Ferrari, Mercedes, Red Bull, Audi, Cadillac, or other constructor chassis. Team colour treatments are stylized presentation only. The bundled model is “basic Lowpoly F1 Car V1” by arthihalder under CC BY 4.0; attribution is preserved in `public/assets/cars/base/LICENSE.txt` and in the typed manifest.

The app therefore labels the vehicle as a geometry placeholder/reference fallback. True close-up constructor realism still requires licensed or independently created high-detail team assets that satisfy [ASSET_REQUIREMENTS.md](./ASSET_REQUIREMENTS.md).

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

The current fallback model does not contain independently modelled, validated 2026 flap hinges, so it does not pretend to animate arbitrary wing meshes as an accurate active-aero mechanism. The aero provider still reacts to the selected mode qualitatively.

Rolling-road speed and wheel angular velocity are derived from free-stream speed. At 0 km/h, free-stream dynamic pressure, wheel RPM, rolling-road motion, and the sampled aero field go to zero. The bundled fallback currently infers wheel spin axes from mesh bounds at runtime; those inferred axes are a temporary fallback behavior and are not equivalent to validated per-wheel manifest axes required for a production asset.

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

The car loader supports GLTF/DRACO/KTX2, normalizes model scale, clones resources safely, applies physically based material treatments by semantic/material role, and supplies geometry bounds to the aero provider. The scene uses ACES-style tone mapping, sRGB output, controlled studio/environment lighting, adaptive DPR, and quality settings.

The shared fallback remains the dominant visual limitation. A production car intended for 1440p/4K close inspection should meet the geometry, texture, semantic, LOD, active-aero, and licensing requirements documented in `ASSET_REQUIREMENTS.md`.

## Licensing

Bundled base car: “basic Lowpoly F1 Car V1” by arthihalder, CC BY 4.0. See `public/assets/cars/base/LICENSE.txt` and the source URL stored in `src/cars/carAssetManifest.ts`.

Only add replacement models, logos, sponsor artwork, photography, or textures when the project has the rights required for redistribution. Official imagery can be used as visual reference without assuming redistribution rights.

This is an unofficial visualization project and is not affiliated with or endorsed by Formula 1, the FIA, or any constructor.
