# Codebase Audit Log

## Iteration 1 — 2026-09-04

Stack: React 19 + TypeScript + Vite + React Three Fiber/Three.js + Zustand. Existing checks are Vitest and the TypeScript/Vite production build. No linter or formatter is configured, so none was introduced during this audit.

Starting Git state: repository already initialized. Two pre-existing untracked image files (`_codex-final-aero.png` and `_codex-final-showcase.png`) were left untouched.

### Findings

| ID | Severity | Category | Location | Finding |
| --- | --- | --- | --- | --- |
| A-001 | Medium | Correctness / error handling | `src/store/useF1Store.ts` | Direct `localStorage` reads/writes can throw in storage-restricted browser contexts, crashing initialization or team selection. |
| A-002 | Medium | Performance | `src/cars/TeamCar.tsx` | Component inference recomputes full-scene bounds for every mesh, creating avoidable O(N²) work when loading high-detail models. |
| A-003 | Low | Dead code | `src/cars/F1Car.tsx`, shader files | The procedural `F1Car` implementation and several legacy shader files are not referenced by the active app. |
| A-004 | Low | Dependencies | `package.json` | Several dependencies have newer releases available; upgrades are non-blocking and may include majors requiring compatibility work. |
| A-005 | Low | Tooling | repository | No configured linter/formatter exists. Per audit guardrails, this is recorded as backlog rather than adding new tooling. |

### Baseline checks

- `npm run verify`: 23 tests passed and production build passed before fixes.
- `npm audit --audit-level=low`: 0 vulnerabilities.
- `npm outdated`: reports available updates only; no dependency-resolution error.
- Fresh `npm ci`: environment-blocked because an already-running Vite dev server holds native Windows binaries open. `npm install` restored the existing install without tracked-file changes; the dev server was left running.

### Fix progress

- A-001: fixed by making saved-team persistence best-effort and adding a regression test proving storage denial does not block team selection.
- A-002: fixed by computing normalized scene bounds once per loaded model and reusing them for every mesh classification instead of traversing the full scene per mesh.

Open Critical/High/Medium count after fixes: 0.
