uniform float uTime;
uniform float uSpeed;
uniform float uYaw;
uniform float uTurbulence;
uniform float uWake;
uniform float uFloor;
uniform float uWakeDeficit;
uniform int uObstacleCount;
uniform vec3 uObstacleMin[12];
uniform vec3 uObstacleMax[12];
varying float vAlpha;

void main() {
  vec3 p = position;
  float travel = uTime * uSpeed * 7.0;
  p.z = mod(position.z - travel + 10.0, 20.0) - 10.0;

  float progress = clamp((8.0 - p.z) / 16.0, 0.0, 1.0);
  p.x += uYaw * progress * 2.8;

  float bodyInfluence = 0.0;
  float side = sign(p.x + 0.0001);
  for (int i = 0; i < 12; i++) {
    if (i >= uObstacleCount) break;
    vec3 bmin = uObstacleMin[i] - vec3(0.10, 0.08, 0.12);
    vec3 bmax = uObstacleMax[i] + vec3(0.10, 0.08, 0.12);
    vec3 centre = (bmin + bmax) * 0.5;
    vec3 halfSize = max((bmax - bmin) * 0.5, vec3(0.08));
    vec3 q = abs(p - centre) / halfSize;
    float nearBox = 1.0 - smoothstep(1.0, 1.55, max(q.x, max(q.y, q.z)));
    bodyInfluence = max(bodyInfluence, nearBox);
    if (nearBox > 0.0) {
      float lateral = sign(p.x - centre.x + 0.0001);
      p.x += lateral * nearBox * 0.22;
      p.y += max(0.0, centre.y - p.y) * nearBox * 0.08;
    }
  }

  // Rear wake starts downstream of the rear axle/body; upstream clean air is
  // intentionally left undisturbed.
  float wakeZone = (1.0 - smoothstep(-4.9, -2.25, p.z)) * uWake;
  float wakeCore = wakeZone * exp(-pow(p.x / 1.5, 2.0)) * exp(-pow((p.y - 0.15) / 1.05, 2.0));
  float phase = p.z * 1.7 + p.x * 2.8 + uTime * uSpeed * 5.0;
  p.x += sin(phase) * 0.28 * uTurbulence * wakeZone;
  p.y += cos(phase * 1.13) * 0.18 * uTurbulence * wakeZone;
  // A velocity-deficit cue: particles bunch/lag in the central downstream
  // corridor. This is qualitative and deliberately not presented as CFD.
  p.z += wakeCore * uWakeDeficit * 1.35;

  if (abs(p.x) < 1.35 && p.y < 0.32) {
    float floorInfluence = exp(-pow((p.z + 0.15) / 3.1, 2.0)) * uFloor;
    p.y = mix(p.y, -0.525, clamp(floorInfluence * 0.56, 0.0, 0.74));
    float diffuserRecovery = (1.0 - smoothstep(-4.5, -2.5, p.z)) * uFloor;
    p.y += diffuserRecovery * 0.24;
    p.x += side * diffuserRecovery * 0.18;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(4.2 / -mv.z, 0.55, 1.75);
  vAlpha = (0.08 + bodyInfluence * 0.34 + wakeZone * 0.08) * smoothstep(0.0, 0.08, uSpeed);
}
