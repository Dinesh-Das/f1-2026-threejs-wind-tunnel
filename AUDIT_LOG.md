# Engineering Audit Log

## Baseline

The original runtime used a large procedural `F1Car` path for every team despite documentation describing another renderer. The bundled glTF was low detail, constructor geometry values and Cd/Cl/load values were heuristic, pressure colouring was not a surface-pressure field, flow layers used separate decorative approximations, active-aero naming/mechanics were not defensible, and an environment selector had no meaningful renderer effect. Lint/format tooling was absent.

Before the major refactor, the repository's existing test/build baseline passed (24 tests plus production build).

## Current refactor

- Replaced dual/procedural production paths with manifest-driven `CarModel` rendering.
- Added typed asset manifests and validation with source, licence, accuracy, semantics, expected dimensions, optional LOD/CFD references, and production-only requirements for explicit per-wheel spin axes. Production active-aero nodes now require explicit parent-local hinge axes/pivots plus Corner/Straight angles; the renderer transforms the declared node hierarchy once and guards against nested mapped hinges being applied twice.
- Added a shared source-glTF node resolver so manifest mappings remain traceable to original asset names while still resolving `GLTFLoader`'s runtime sanitization. This removes false missing-wheel/semantic diagnostics without weakening production validation. Repeated diagnostics for the same shared fallback asset are reported once per issue while production-model diagnostics remain per asset.
- Kept the shared CC-BY-4.0 low-poly model as an explicitly labelled fallback for all teams; no constructor-specific geometry accuracy is claimed.
- Added a geometry field registry sourced from loaded semantic mesh bounds.
- Added `AeroFieldProvider` types, a geometry-aware realtime approximation provider, and a genuine precomputed-CFD adapter/provider boundary. The CFD loader validates provenance/conditions/grid data, supports exact-condition selection plus compatible speed interpolation, and falls back to the geometry-aware provider when no valid dataset is available.
- Migrated streamlines, velocity glyphs, vorticity, ground-effect, relative-pressure estimate, wake, center slice, probe, and particle obstacle handling toward the shared field; streamlines use RK2-style integration and obstacle projection.
- Added a provider-backed engineering probe reporting world coordinates, local velocity, V/V∞, relative pressure estimate, relative vorticity, and provider provenance.
- Split aero controls into physical/scenario inputs and visualization controls. Explicit yaw is authoritative store state; flow presets write free-stream speed and yaw rather than composing yaw twice.
- Derived rolling-road speed and wheel angular velocity from free-stream speed, including zero-speed invariants. The fallback currently infers wheel spin axes from mesh bounds because the bundled asset has no validated wheel-axis metadata.
- Removed guessed constructor Cd/Cl/load presentation and the old fake pressure-map material path. The replacement pressure layer is explicitly labelled a relative-pressure estimate, not Cp.
- Removed dead environment state/control and obsolete procedural renderer/heuristic flow/shader files.
- Switched UI terminology to CORNER MODE / STRAIGHT MODE.
- Added asset requirements, strict manifest tests, aero-provider tests, and ESLint/Prettier tooling.

## Scientific/asset limitations

No CFD dataset is bundled. All live flow visualization is a geometry-aware qualitative approximation, not CFD or measured constructor data. The fallback model lacks trustworthy independently modelled 2026 active-aero hinges, explicit validated wheel rotation axes, high-detail constructor geometry, and production-quality team textures. These gaps prevent truthful per-team photorealism and exact active-aero animation.

## Licensing/provenance

The shared model is “basic Lowpoly F1 Car V1” by arthihalder under CC BY 4.0. Attribution is retained in `public/assets/cars/base/LICENSE.txt` and the manifest. Production replacement assets must provide equivalent provenance/licensing metadata.

## Verification

Current focused audit coverage is 21 tests, including manifest/aero-provider behavior, source-glTF/runtime-node mapping, loaded wheelbase/scale validation, production wheel-axis validation, synthetic precomputed-CFD sampling/selection/interpolation, zero-yaw symmetry, obstacle-aware streamlines, explicit yaw, state invariants, and zero-speed rolling-road/wheel invariants. Earlier baseline evidence showed 24 tests before the refactor; the current suite was deliberately rewritten around the new architecture rather than preserving obsolete assertions.

Final `npm run verify` passes: strict TypeScript typecheck, 21/21 tests, ESLint, and the Vite production build all succeed. `npm run format:check` also passes.

Runtime inspection confirmed that an independent browser path renders the full application UI tree, including all 11 constructors, camera presets, aero controls, accuracy/provenance labels, and the fallback-model limitation messaging. The separate CDP screenshot harness produced blank white images with an empty `#root`, so those screenshots are invalid visual evidence. Because the browser screenshot bridge did not return inspectable pixels, full appearance QA across the required constructor/camera/aero matrix remains incomplete and must not be claimed as passed.
