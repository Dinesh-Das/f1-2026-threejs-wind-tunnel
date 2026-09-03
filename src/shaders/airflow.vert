uniform float uTime;
uniform float uSpeed;
varying float vAlpha;

void main() {
  vec3 p = position;
  float speed = mix(0.05, 5.8, uSpeed);
  p.z -= mod(uTime * speed + (position.z + 10.0), 20.0) - (position.z + 10.0);
  p.z = mod(p.z + 10.0, 20.0) - 10.0;

  float bodyInfluence = exp(-abs(p.z) * 0.34) * exp(-abs(p.y - 0.25) * 0.65);
  float side = sign(p.x + 0.0001);
  p.x += side * bodyInfluence * max(0.0, 1.45 - abs(p.x)) * 0.46;
  p.y += sin(p.z * 1.3 + p.x * 2.0 + uTime) * 0.025 * bodyInfluence;
  if (abs(p.x) < 1.1 && p.y < 0.35) p.y -= bodyInfluence * 0.20;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(5.0 / -mv.z, 0.7, 2.3);
  vAlpha = 0.18 + bodyInfluence * 0.6;
}
