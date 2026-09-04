# F1 2026 Three.js Garage & Wind Tunnel

An interactive React Three Fiber / Three.js F1-style 2026 garage and aerodynamic wind-tunnel showcase. The current build ships one legally reusable shared chassis, reskins it in place for all 11 constructor presentations, and combines physical materials, HDR environment lighting, engineering inspection modes, active-aero visualization, and GPU-driven airflow effects.

> Accuracy note: the bundled chassis is a low-poly reference model, not an exact or official 2026 team car. Team liveries are stylized and do not reproduce exact sponsor artwork. Airflow, pressure, velocity, ground-effect, and active-aero graphics are illustrative visualizations, not CFD, telemetry, or measured constructor data.

## Install and run

```bash
npm install
npm run dev
```

Production verification and preview:

```bash
npm run verify
npm run preview
```

## Controls

- Mouse: left drag orbit, wheel zoom, right drag pan.
- `1` Hero, `2` Front, `3` Side, `4` Rear, `5` Top.
- `A` Aerodynamics, `W` Wind tunnel, `F` floor inspection, `X` X-Ray, `E` Exploded view, `C` Cinematic, `R` reset, `Space` turntable pause, `Esc` clear selection.
- In Aerodynamics / Wind Tunnel, enable Active Aero and switch between `Z-MODE · DOWNFORCE` and `X-MODE · LOW DRAG` to animate the inferred front/rear flap groups.
- Click inferred car components to focus technical inspection.

## Bundled assets and licensing

The shared chassis is bundled at:

```text
public/assets/cars/base/scene.gltf
public/assets/cars/base/scene.bin
public/assets/cars/base/LICENSE.txt
```

It is based on **“basic Lowpoly F1 Car V1” by arthihalder**, licensed under **CC BY 4.0**. Attribution and the source URL are preserved in `public/assets/cars/base/LICENSE.txt`.

The studio HDRI is bundled at:

```text
public/assets/hdr/studio_small_03_1k.hdr
```

and is distributed under CC0. Runtime decoder assets for Draco-compressed geometry and KTX2/Basis textures are also bundled under `public/assets/draco` and `public/assets/basis`.

Only add third-party logos, sponsor artwork, photography, driver imagery, audio, or replacement car models when you have the required rights to ship them.

## Shared chassis and team reskinning

All normal teams currently use the same shared glTF chassis. `src/cars/TeamCar.tsx` loads the model with `GLTFLoader`, `DRACOLoader`, and `KTX2Loader`, clones its geometry/materials, converts visible surfaces to `MeshPhysicalMaterial`, normalizes the car to the reference wheelbase, and infers component roles from the loaded hierarchy.

Switching teams does not reload the shared glTF. Team colors and physical-material properties are updated in place, so the 11-team selector behaves like a data-driven livery/configuration switch over one base mesh.

Team presentation data lives in `src/data/teams.ts`. The bundled liveries are intentionally stylized color treatments; they are not claimed to be exact replicas of 2026 paint, sponsor placement, or confidential geometry.

## Active aero

The UI keeps the existing internal aero-state values while presenting the 2026-style labels:

- `Z-MODE · DOWNFORCE`
- `X-MODE · LOW DRAG`

`TeamCar.tsx` identifies likely front- and rear-wing flap meshes from the model hierarchy and animates their rotations as a visual proxy for active-aero state changes. This demonstrates the interaction architecture only; the included mesh does not encode an official constructor mechanism, homologated travel range, or FIA geometry.

## Engineering views

The same inferred mesh/component groups power component selection, x-ray rendering, exploded view, floor isolation, and pressure highlighting. Because the shared model was not authored with this application’s semantic mesh names, the runtime uses hierarchy/name inference rather than depending on exact vendor node labels.

The technical panel reports calculated reference values such as free-stream speed, dynamic pressure, and wheel RPM from the selected wind speed using the stated standard-air-density assumption (`1.225 kg/m³`). These are derived display values, not telemetry.

## Aerodynamic visualization

`FlowParticles.tsx` uses a GPU `Points` simulation with custom GLSL. Particle motion reaches zero at 0 km/h and scales with the selected wind speed and scenario. Streamlines, vortex, velocity-field, wake, and ground-effect layers remain independently controllable for quality/performance.

The wind-tunnel presentation models a moving ground plane opposite the car’s forward direction and rotates the wheels from the configured free-stream-equivalent speed. Crosswind/yaw is applied to the flow scenario while the car remains aligned to the tunnel centerline.

Pressure and velocity modes are visual approximations. The shader/data boundaries are intentionally isolated so real CFD fields can replace the illustrative data later.

## Lighting, rendering, and performance

The scene uses HDR environment lighting, physical materials, ACES tone mapping, sRGB output, adaptive DPR, selective shadows, and restrained post-processing. The post-processing composer uses an unsigned-byte render target with multisampling disabled for broad WebGL compatibility; N8AO, SMAA, and subtle bloom are enabled on that stable target.

Quality modes adjust DPR and aerodynamic particle density. Production assets can additionally use LODs, compressed KTX2 textures, and Draco/Meshopt geometry.

## Replacing the low-poly chassis with a high-detail model

The main remaining visual limitation is geometry fidelity. To reach true configurator / photoreal showcase quality, replace the shared chassis with a properly licensed high-detail Formula-style GLB/GLTF while retaining the same data-driven architecture.

Recommended workflow:

1. Obtain or create a model whose license permits your intended distribution/commercial use.
2. Replace `public/assets/cars/base/scene.gltf` and its dependent buffers/textures, or point the team data to an authorized model path.
3. Preserve sensible hierarchy/node names for body, floor, wheels, front wing, rear wing, and movable flap groups where possible.
4. Keep the model Y-up, consistently scaled, and centered close to its origin. Runtime normalization handles common unit differences, but a clean export produces better inspection and animation behavior.
5. Run `npm run verify` and visually exercise team switching, engineering modes, and both active-aero states after every model revision.

The current application deliberately does not bundle unofficial 2026 constructor GLBs whose licenses do not permit redistribution of the relevant car assets.

## Real CFD integration path

Keep solver data behind an adapter layer instead of coupling a CFD file format directly to the scene. Useful inputs include sampled velocity vectors, surface pressure coefficient (`Cp`), scalar velocity fields, vortex paths, and transient time steps.

A practical pipeline is: preprocess solver output offline → quantize/compress → load binary or texture resources → sample in GLSL. A 3D texture can drive particle advection, while per-vertex or texture-space `Cp` can drive the pressure visualization. When real engineering datasets are introduced, expose provenance, units, assumptions, and timestep metadata in the technical panel.

## Disclaimer

This is an unofficial engineering-visualization project and is not affiliated with, endorsed by, or sponsored by Formula 1, the FIA, or any constructor. Formula 1, F1, constructor names, logos, and related marks remain the property of their respective owners.
