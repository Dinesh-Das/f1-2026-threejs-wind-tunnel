# Production Car Asset Requirements

The renderer is manifest-driven. Replacing the bundled fallback must require only a new GLB/GLTF plus a `CarAssetManifest` entry; rendering code must not contain constructor-specific geometry branches.

## Quality target

- Roughly 150k–500k visible triangles for the selected high-detail car, with lower LODs where useful.
- Stable real-world scale: expected wheelbase around the current 2026 public reference envelope and width no greater than 1.9 m.
- Clean Y-up export with an explicitly declared forward axis.
- Compressed geometry and textures when justified; KTX2/Basis for production texture sets is preferred.
- 2K–4K textures only where close-up inspection benefits from them.

## Required geometry semantics

Production assets must provide explicit manifest mappings or glTF `extras` for: `frontWing`, `nose`, `frontSuspension`, `frontWheels`, `sidepods`, `floor`, `diffuser`, `rearSuspension`, `rearWing`, `rearWheels`, `halo`, `cockpit`, and `bodywork`. Manifest mappings should use the original source glTF node names; the loader boundary resolves Three.js runtime name sanitization centrally.

Wheel nodes must be mapped individually. If wheel animation is enabled, the manifest must also contain an explicit validated rotation axis for each wheel; do not infer an axis from vendor node names.

The bundled shared fallback currently infers a wheel spin axis at runtime from each wheel mesh's bounds so the demo can show speed-linked rotation. That inference is a temporary fallback behavior only and **does not satisfy** the production requirement above. A production constructor asset still needs explicit, validated wheel axes in its manifest/glTF metadata and visual verification of rotation direction.

## Active aero

A production asset must contain independently modelled front and rear active-aero elements. For every moving node, the manifest must define the exact node name, a hinge axis expressed in the node parent's local coordinate system, and either the node origin or an explicit parent-local hinge point. Each front/rear system must also define validated Corner Mode / Straight Mode angles. Do not map both a moving parent and one of its descendants as separate hinges; the runtime guards against this to prevent double transforms. The bundled fallback has no trustworthy hinge metadata and therefore deliberately leaves these mappings unavailable.

## Materials and textures

- Paint should use dielectric PBR response with clearcoat rather than high global metalness.
- Carbon, rubber, rims, cockpit materials, and glass must remain materially distinct.
- Albedo/emissive textures use sRGB; normal, roughness, metalness, and AO remain linear.
- Author texture scale and UVs for close inspection; avoid obvious repetition.

## Provenance and licensing

Every manifest must record source URL, author when known, licence name/URL, attribution requirements, accuracy classification, reference revision, and reference date when verified. Do not label a generic chassis as an exact constructor model.

## Optional CFD data

CFD datasets remain external to the renderer through an adapter/provider boundary. The current runtime adapter accepts the versioned `json-grid-v1` regular-grid interchange schema in `src/aerodynamics/core/cfdDataset.ts`. A usable dataset must record source, speed, yaw, aero mode, geometry revision, coordinate system, units, characteristic length, grid origin/spacing/dimensions, and sampled velocity. Relative pressure/Cp, vorticity, wake deficit, and occupancy are optional. The loader validates array sizes, finite values, manifest conditions, and dataset identity before the CFD provider can become active.

Manifest dataset references may opt into speed interpolation with an explicit `interpolationGroup`. Interpolation is allowed only between datasets with matching geometry revision, coordinate system, yaw, aero mode, grid layout, and field units. Unsupported or missing CFD data falls back to the geometry-aware approximation. No CFD dataset is bundled with the repository today.

`json-grid-v1` is an interchange/runtime baseline, not a recommendation to ship large production CFD volumes as verbose JSON. Production data should be preprocessed into a compact binary/texture representation behind the same provider boundary when real datasets are available.

## Replacement workflow

1. Add the licensed/recreated model and dependent textures under `public/assets/cars/<team>/`.
2. Add or replace that team's `CarAssetManifest` entry with verified scale, axes, semantics, wheel mappings, active-aero mappings, provenance, licence, and bounds.
3. Keep `fallbackForTeam: false` only when the supplied model truly represents that team/reference revision.
4. Run `npm run verify`, then inspect close-ups, team switching, x-ray/explode/floor views, Corner/Straight modes, and aero visualizations.
