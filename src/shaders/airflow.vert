uniform float uTime;
uniform float uSpeed;
uniform float uYaw;
uniform float uTurbulence;
uniform float uWake;
uniform float uFloor;
uniform float uLateral;
uniform float uWakeDeficit;
uniform float uNoseWidth;
uniform float uSidepodWidth;
uniform float uUndercut;
uniform float uFloorWidth;
uniform float uDiffuser;
uniform float uRearWing;
varying float vAlpha;

void main() {
  vec3 p = position;
  float travel = uTime * uSpeed * 7.0;
  p.z = mod(position.z - travel + 10.0, 20.0) - 10.0;

  float progress = clamp((8.0 - p.z) / 16.0, 0.0, 1.0);
  p.x += uYaw * progress * 2.8;

  float noseEnvelope = exp(-pow((p.z - 3.25) / 1.0, 2.0));
  float sidepodEnvelope = exp(-pow((p.z + 0.05) / 1.7, 2.0));
  float bodyWidth = mix(1.34 * uNoseWidth, 1.55 * uSidepodWidth, sidepodEnvelope);
  float bodyInfluence = exp(-pow(p.z / 3.2, 2.0)) * exp(-abs(p.y - 0.15) * 0.72);
  float side = sign(p.x + 0.0001);
  p.x += side * bodyInfluence * max(0.0, bodyWidth - abs(p.x)) * (0.36 + noseEnvelope * 0.07) * uLateral;

  // Rear wake starts downstream of the rear axle/body; upstream clean air is
  // intentionally left undisturbed.
  float wakeZone = (1.0 - smoothstep(-4.9, -2.25, p.z)) * uWake;
  float wakeCore = wakeZone * exp(-pow(p.x / (1.48 + 0.12 * uRearWing), 2.0)) * exp(-pow((p.y - 0.15) / 1.05, 2.0));
  float phase = p.z * 1.7 + p.x * 2.8 + uTime * uSpeed * 5.0;
  p.x += sin(phase) * 0.28 * uTurbulence * wakeZone;
  p.y += cos(phase * 1.13) * 0.18 * uTurbulence * wakeZone;
  // A velocity-deficit cue: particles bunch/lag in the central downstream
  // corridor. This is qualitative and deliberately not presented as CFD.
  p.z += wakeCore * uWakeDeficit * 1.35;

  if (abs(p.x) < 1.25 * uFloorWidth && p.y < 0.32) {
    float floorInfluence = exp(-pow((p.z + 0.15) / 3.1, 2.0)) * uFloor * uUndercut;
    p.y = mix(p.y, -0.525, clamp(floorInfluence * 0.56, 0.0, 0.74));
    float diffuserRecovery = (1.0 - smoothstep(-4.5, -2.5, p.z)) * uFloor;
    p.y += diffuserRecovery * 0.24 * uDiffuser;
    p.x += side * diffuserRecovery * 0.18 * uDiffuser;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(5.0 / -mv.z, 0.7, 2.3);
  vAlpha = (0.12 + bodyInfluence * 0.52 + wakeZone * 0.12) * smoothstep(0.0, 0.08, uSpeed);
}
