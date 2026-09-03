uniform vec3 uBaseColor;
varying vec3 vNormal;
varying vec3 vWorld;
void main(){ vec3 viewDir=normalize(cameraPosition-vWorld); float fresnel=pow(1.0-max(dot(normalize(vNormal),viewDir),0.0),5.0); float flake=fract(sin(dot(vWorld.xy,vec2(12.9898,78.233)))*43758.5453); vec3 color=uBaseColor*(.82+.18*flake)+fresnel*.24; gl_FragColor=vec4(color,1.0); }
