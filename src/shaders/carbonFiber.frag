varying vec2 vUv;
varying vec3 vNormal;
void main(){ vec2 p=vUv*180.0; float weave=step(.5,fract((floor(p.x)+floor(p.y))*.5)); vec3 base=mix(vec3(.025),vec3(.075),weave); gl_FragColor=vec4(base,1.0); }
