# F1 2026 Three.js Garage & Wind Tunnel

An interactive F1 2026 Three.js / React Three Fiber digital garage and aerodynamic wind-tunnel experience with all 11 constructors, team-specific presentation, interactive engineering views, and GPU-driven airflow visualization. It works immediately with a procedural Formula-style regulation proxy and is designed so authorized production GLB assets can replace the proxy architecture without changing the UI/state model.

> The included car geometry is a reference-based proxy, not an exact 2026 team car. Procedural airflow, pressure and velocity graphics are visual aerodynamic simulations, not CFD or measured team data.

## Install and run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Controls

- Mouse: left drag orbit, wheel zoom, right drag pan.
- `1` Hero, `2` Front, `3` Side, `4` Rear, `5` Top.
- `A` Aerodynamics, `W` Wind tunnel, `F` isolate/inspect the floor from below, `X` X-Ray, `E` Exploded view, `C` Cinematic, `R` reset, `Space` turntable pause, `Esc` clear selection.
- Click proxy components to focus technical inspection.

## Asset folders

Place authorized assets under `public/assets`:

```text
public/assets/
  cars/{team}/{team}-2026.glb       # optional authorized asset
  teams/{team}/logo.webp
  drivers/
  textures/
  hdr/
  audio/
```

Team paths are configured in `src/data/teams.ts`. The included teams intentionally omit `carModel`, because no production GLBs are bundled; this prevents fake/missing-model requests and renders the regulation-based proxy immediately.

## Replacing the proxy with a production GLB

1. Export the authorized car in GLB/GLTF, preferably with Draco/Meshopt compression.
2. Put it under `public/assets/cars/{team}` and set that team's optional `carModel` path in `src/data/teams.ts`, for example `/assets/cars/ferrari/ferrari-2026.glb`.
3. Keep logical mesh names consistent or update that team's `meshMap` in `src/data/teams.ts`.
4. `TeamCar.tsx` automatically loads the configured GLB, normalizes its scale/ground position, and uses `meshMap` for component selection, x-ray, pressure highlighting, exploded view, and named active-aero flaps.
5. If the GLB is absent or fails to load, the procedural proxy is shown automatically, so a missing licensed model never breaks the experience.

Production GLBs should use Y-up coordinates with the car length running on Z and the nose pointing toward +Z. Keep the model centered near its origin; runtime normalization handles common unit-scale differences.

Recommended logical mesh targets:

```text
BODY, MONOCOQUE, NOSE, FRONT_WING, FRONT_WING_FLAPS,
REAR_WING, REAR_WING_FLAPS, FLOOR, DIFFUSER,
SIDEPOD_L, SIDEPOD_R, HALO, ENGINE_COVER, AIRBOX,
FRONT_SUSPENSION, REAR_SUSPENSION,
FRONT_LEFT_WHEEL, FRONT_RIGHT_WHEEL,
REAR_LEFT_WHEEL, REAR_RIGHT_WHEEL, COCKPIT, DRIVER
```

Different vendor naming is supported by mapping logical components to arbitrary mesh names:

```ts
meshMap: {
  frontWing: ['FW_MAIN', 'FW_FLAP_01'],
  rearWing: ['RW_MAIN', 'RW_FLAP'],
  floor: ['FLOOR_MAIN'],
  diffuser: ['DIFFUSER'],
  wheels: ['WHEEL_FL', 'WHEEL_FR', 'WHEEL_RL', 'WHEEL_RR'],
}
```

## Logos, liveries and textures

Keep trademarks and sponsor artwork as external replaceable files in `public/assets/teams/{team}` or car textures. Do not bake trademark graphics into procedural shaders. KTX2/Basis is recommended for production texture delivery. HDRIs belong under `public/assets/hdr`.

## Aerodynamic visualization

`FlowParticles.tsx` uses a single GPU `Points` draw with custom GLSL. Particle advection reaches zero at 0 km/h, scales with the wind-speed control, and changes its yaw/turbulence/wake/underfloor behavior with the selected illustrative flow scenario. `Streamlines`, `VortexField`, `VelocityField`, and `GroundEffect` use the same scenario model and remain separate visualization layers so each can be disabled for performance.

The wind-tunnel scene also models the two most important moving-ground conditions for a stationary test car: the rolling road moves opposite the car's forward direction at the free-stream-equivalent speed, and the wheels rotate from `ω = V / r` using the public 2026 tyre diameters. At 0 km/h the airflow, rolling road and wheels stop together. Aero mode also locks the car centerline to the tunnel; crosswind/yaw is applied to the flow scenario instead of leaving the showroom turntable at an arbitrary angle.

The technical panel derives free-stream speed, dynamic pressure and front/rear wheel rpm from the user-set wind speed with an explicitly stated standard-air-density assumption (`1.225 kg/m³`). These values are calculated references, not telemetry or CFD outputs. The dirty-air/slipstream presets apply their strongest disturbance and qualitative velocity-deficit cue downstream of the car, while the underfloor visualization contracts through the floor region and expands through the diffuser recovery region.

The pressure mode currently changes the visual treatment for demonstration. The shader files under `src/shaders` are intentionally isolated so production pressure/velocity fields can replace the procedural approximations.

## Integrating real CFD later

Use a data-adapter layer that converts solver exports into GPU-friendly resources rather than coupling a particular CFD format to scene components. Typical inputs:

- vector-field volumes or sampled velocity vectors,
- surface pressure coefficient (`Cp`) values mapped by vertex/UV,
- velocity scalar fields,
- vortex core/path data,
- time steps for transient results.

Recommended pipeline: preprocess solver data offline → quantize/compress → load binary/texture resources → sample in GLSL. A 3D texture can drive particle advection; per-vertex or texture `Cp` can drive the pressure shader. Add explicit dataset provenance and units in the technical panel whenever real engineering data is loaded.

## Performance

Quality modes change DPR and particle density. The renderer uses ACES tone mapping, adaptive DPR, instanced/GPU-friendly aero rendering, selective shadows, and restrained post-processing. For production licensed models add LODs, KTX2 textures, Draco/Meshopt decode and device-aware texture resolution.

## Licensing and accuracy

Only ship logos, liveries, driver portraits, models, photography, audio and sponsor marks when you have the required rights. Public reference imagery can inform your own authorized modeling process, but unrevealed or confidential engineering details should never be invented and presented as factual. Keep `reference_based_approximation: true` for proxy/reference-derived geometry until an appropriately licensed and verified production asset replaces it.

This is an unofficial engineering visualization project and is not affiliated with, endorsed by, or sponsored by Formula 1, the FIA, or any constructor. Formula 1, F1, constructor names, logos, and related marks remain the property of their respective owners.
