uniform float uTime;
uniform float uSpeed;
uniform float uYaw;
uniform float uTurbulence;
uniform float uWake;
uniform float uFloor;
uniform float uLateral;
varying float vAlpha;

void main() {
  vec3 p = position;
  float travel = uTime * uSpeed * 7.0;
  p.z = mod(position.z - travel + 10.0, 20.0) - 10.0;

  float progress = clamp((8.0 - p.z) / 16.0, 0.0, 1.0);
  p.x += uYaw * progress * 2.8;

  float bodyInfluence = exp(-pow(p.z / 3.2, 2.0)) * exp(-abs(p.y - 0.15) * 0.72);
  float side = sign(p.x + 0.0001);
  p.x += side * bodyInfluence * max(0.0, 1.48 - abs(p.x)) * 0.42 * uLateral;

  float wakeZone = (1.0 - smoothstep(-4.8, 0.4, p.z)) * uWake;
  float phase = p.z * 1.7 + p.x * 2.8 + uTime * uSpeed * 5.0;
  p.x += sin(phase) * 0.28 * uTurbulence * wakeZone;
  p.y += cos(phase * 1.13) * 0.18 * uTurbulence * wakeZone;

  if (abs(p.x) < 1.25 && p.y < 0.38) {
    p.y -= bodyInfluence * 0.2 * uFloor;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(5.0 / -mv.z, 0.7, 2.3);
  vAlpha = (0.12 + bodyInfluence * 0.52 + wakeZone * 0.12) * smoothstep(0.0, 0.08, uSpeed);
}
