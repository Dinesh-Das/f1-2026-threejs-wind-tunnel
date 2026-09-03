varying vec3 vNormal;
varying vec3 vWorld;
void main(){ vNormal = normalize(normalMatrix * normal); vec4 world = modelMatrix * vec4(position,1.0); vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }
