uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float edge = smoothstep(0.5, 0.2, d);
  float core = smoothstep(0.24, 0.0, d);
  float alpha = edge * (0.62 + core * 0.38);
  gl_FragColor = vec4(uColor, alpha * vAlpha);
}
