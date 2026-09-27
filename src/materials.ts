import * as THREE from 'three';

export function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function surface(w: number, h: number) { const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h; return { canvas, ctx: canvas.getContext('2d')! }; }
function texture(canvas: HTMLCanvasElement, repeat=false) { const t=new THREE.CanvasTexture(canvas); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; if(repeat) t.wrapS=t.wrapT=THREE.RepeatWrapping; return t; }

function leafTexture() {
  const {canvas,ctx}=surface(256,512), r=rng(459);
  const gr=ctx.createLinearGradient(0,0,256,0); gr.addColorStop(0,'#42592a');gr.addColorStop(.43,'#809e44');gr.addColorStop(.5,'#a1b662');gr.addColorStop(.56,'#69893a');gr.addColorStop(1,'#2f4929');ctx.fillStyle=gr;ctx.fillRect(0,0,256,512);
  for(let i=0;i<18000;i++){const v=r();ctx.fillStyle=v>.5?'rgba(200,214,112,.065)':'rgba(9,30,8,.08)';ctx.fillRect(r()*256,r()*512,1+r()*2,1+r()*3);}
  ctx.lineWidth=2;ctx.strokeStyle='#b2c27788';ctx.beginPath();ctx.moveTo(128,0);ctx.lineTo(128,512);ctx.stroke();
  for(let y=24;y<500;y+=24){for(const s of [-1,1]){ctx.lineWidth=.9;ctx.strokeStyle='#c0ce8677';ctx.beginPath();ctx.moveTo(128,y);ctx.bezierCurveTo(128+s*40,y-9,128+s*90,y-30,128+s*128,y-58);ctx.stroke();for(let k=1;k<6;k++){ctx.lineWidth=.4;ctx.strokeStyle='#bdcc7955';ctx.beginPath();ctx.moveTo(128+s*k*21,y-k*7);ctx.lineTo(128+s*(k*21+16),y-k*7+11);ctx.stroke();}}}
  for(let i=0;i<32;i++){let x=r()*240,y=r()*500,a=1+r()*3;ctx.fillStyle='#15270c88';ctx.beginPath();ctx.ellipse(x,y+1,a,a*1.3,0,0,7);ctx.fill();ctx.strokeStyle='#e5edb688';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,a,3.5,5.8);ctx.stroke();}
  return texture(canvas);
}
function barkTexture(){const {canvas,ctx}=surface(512,1024),r=rng(1567);ctx.fillStyle='#48453a';ctx.fillRect(0,0,512,1024);for(let i=0;i<28000;i++){const x=r()*512,y=r()*1024,n=Math.floor(25+r()*65);ctx.fillStyle=`rgba(${n+5},${n+2},${n-6},${.1+r()*.45})`;ctx.fillRect(x,y,.6+r()*6,3+r()*75);}for(let i=0;i<16000;i++){const x=r()*512,y=r()*1024;const moss=Math.sin(x*.039+Math.sin(y*.009)*3)+Math.cos(y*.013+x*.008);if(moss>.05){const n=30+r()*48;ctx.fillStyle=`rgba(${n*.82},${n+18},${n*.38},${r()*.7})`;ctx.fillRect(x,y,1+r()*5,1+r()*8);}}const t=texture(canvas,true);t.repeat.set(2,3);return t;}
function soilTexture(){const {canvas,ctx}=surface(512,512),r=rng(898);ctx.fillStyle='#24261b';ctx.fillRect(0,0,512,512);for(let i=0;i<45000;i++){const n=15+r()*47;ctx.fillStyle=`rgb(${n*.95},${n},${n*.55})`;ctx.fillRect(r()*512,r()*512,1+r()*5,1+r()*5);}for(let i=0;i<500;i++){ctx.save();ctx.translate(r()*512,r()*512);ctx.rotate(r()*7);ctx.fillStyle=['#49402b','#343d20','#525136','#242a19'][Math.floor(r()*4)];ctx.beginPath();ctx.ellipse(0,0,2+r()*3,4+r()*10,0,0,7);ctx.fill();ctx.restore();}const t=texture(canvas,true);t.repeat.set(24,24);return t;}

export function createMaterials() {
 const leaf=leafTexture(), bark=barkTexture(), soil=soilTexture();
 const leaves=new THREE.MeshStandardMaterial({map:leaf,roughness:.68,metalness:0,side:THREE.DoubleSide});
 const fern=new THREE.MeshStandardMaterial({map:leaf,roughness:.65,side:THREE.DoubleSide,color:0x91ab6b});
 const wood=new THREE.MeshStandardMaterial({map:bark,bumpMap:bark,bumpScale:.14,roughness:.92});
 const moss=new THREE.MeshStandardMaterial({color:0x556c2c,roughness:1});
 const ground=new THREE.MeshStandardMaterial({map:soil,bumpMap:soil,bumpScale:.065,roughness:1});
 const vine=new THREE.MeshStandardMaterial({color:0x424b24,roughness:.95});
 const uniforms={time:{value:0},wind:{value:.35}};
 for(const mat of [leaves,fern]){
  mat.onBeforeCompile=shader=>{shader.uniforms.uTime=uniforms.time;shader.uniforms.uWind=uniforms.wind;shader.vertexShader='uniform float uTime; uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
    vec3 origin = instanceMatrix[3].xyz;
    float phase = uTime * 0.7 + origin.x * 0.63 + origin.z * 0.47;
    transformed.z += sin(phase + position.y * 2.1) * 0.07 * uWind * position.y;
    transformed.x += cos(phase * 0.79) * 0.028 * uWind * position.y;
  #endif`);};
 }
 return {leaves,fern,wood,moss,ground,vine,uniforms};
}
