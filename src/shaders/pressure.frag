varying vec3 vPos;
void main(){ float t=clamp(vPos.z*.15+.5,0.0,1.0); vec3 cool=vec3(.05,.22,1.0); vec3 warm=vec3(1.0,.12,.02); gl_FragColor=vec4(mix(cool,warm,t),.72); }
