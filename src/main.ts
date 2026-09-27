import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {buildForest,heightAt} from './forest';
import {loadScans} from './scans';
import {createPresenceView} from './presence-view';
import {Ambience} from './ambience';
import './style.css';

const assetBase=import.meta.env.BASE_URL;
document.querySelector('#app')!.innerHTML=`
 <div class="vignette"></div><header><div class="eyebrow">SOMEONE IS STILL HERE</div><h1>幽緑</h1><p>歩くのをやめても、気配は消えない。</p></header>
 <nav class="toolbar" aria-label="シーン設定"><button class="icon-btn" id="audio" aria-pressed="false">音：切</button><button class="icon-btn" id="pause" aria-pressed="false">一時停止</button><button class="icon-btn" id="settings" aria-expanded="false">調整</button><button class="icon-btn" id="fullscreen" aria-label="全画面にする">⛶</button></nav>
 <section class="panel hidden" id="panel" aria-label="描画設定"><label for="light">暗がりの明るさ <output id="light-value">100%</output></label><input id="light" type="range" min="70" max="180" value="100"><label for="fog">霧の深さ <output id="fog-value">65%</output></label><input id="fog" type="range" min="0" max="100" value="65"><label for="wind">葉の揺らぎ <output id="wind-value">20%</output></label><input id="wind" type="range" min="0" max="100" value="20"><label data-row>画質<select id="quality"><option value="high">高精細</option><option value="medium">軽量</option></select></label><div class="panel-actions"><button class="pill" id="reference">元の画像</button><button class="pill" id="capture">写真を保存</button></div><p>ドラッグで見回す · WASD / 矢印で移動<br>F で灯り · P で一時停止 · R で初期位置<br>H で画面表示を切替 · Esc でマウスを解除</p><p class="status" id="stats"></p></section>
 <div class="bottom"><div class="hint" id="hint">木々の間を、よく見て。<span>ドラッグで見回す / WASD で移動 / F で灯り</span></div><div class="actions"><button class="pill" id="lantern" aria-pressed="false">灯り：切</button><button class="pill" id="reset">初期位置</button><button class="walk" id="walk">森を歩く ↗</button></div></div>
 <div class="touch-move"><button aria-label="前へ進む" id="forward">↑</button><button aria-label="後ろへ戻る" id="backward">↓</button></div>
 <div class="pause-note hidden" id="pause-note">時を止めています<span>P または「再開」で戻る</span></div>
 <div class="crosshair hidden" id="crosshair"></div><div class="toast hidden" id="toast" role="status"></div>
 <div class="modal hidden" id="reference-modal" role="dialog" aria-modal="true" aria-label="再現の元となった画像"><button class="icon-btn close" id="close-reference">閉じる ×</button><img src="${assetBase}reference.png" alt="葉とシダが密集する、苔に覆われた暗い森の生成画像"><p>REFERENCE IMAGE / 元となった画像</p></div>
 <div class="loading" id="loading">木々の向こうに、誰かがいる<small>森を読み込んでいます</small></div>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x142322);
scene.fog=new THREE.FogExp2(0x243b38,.044);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.08,95);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}
catch{ $('loading').innerHTML='WebGL 2 を利用できません。<small>ハードウェアアクセラレーションを有効にして再読み込みしてください。</small>';throw new Error('WebGL 2 unavailable');}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','気配が後をつける3Dの森');renderer.domElement.tabIndex=0;
scene.add(new THREE.HemisphereLight(0xadc2c2,0x1c2117,.9));
const sun=new THREE.DirectionalLight(0xa9c3c5,.85);sun.position.set(-8,23,-12);sun.target.position.set(0,0,-2);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:65});sun.shadow.bias=-.0002;sun.shadow.normalBias=.055;scene.add(sun,sun.target);
const bounce=new THREE.DirectionalLight(0x879a95,.12);bounce.position.set(0,7,12);scene.add(bounce);
const lantern=new THREE.SpotLight(0xc9d1b1,0,23,.42,.7,1.1);scene.add(lantern,lantern.target);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new OutputPass());
const ambience=new Ambience();
const state={x:0,z:9,yaw:0,pitch:-.04,walking:false,dragging:false,hidden:false,ready:false,paused:false,lantern:false};
const keys=new Set<string>();let forest:ReturnType<typeof buildForest>;let presence:ReturnType<typeof createPresenceView>;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastX=0,lastY=0,time=0,last=performance.now(),frames=0,elapsed=0,fps=0,toastTimer=0;
const times:number[]=[];
const modalOpen=()=>!$('reference-modal').classList.contains('hidden');
const simulationPaused=()=>state.paused||modalOpen()||!$('panel').classList.contains('hidden')||document.hidden;
function toast(text:string){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.remove('hidden');toastTimer=window.setTimeout(()=>$('toast').classList.add('hidden'),3000);}
function reset(){state.x=0;state.z=9;state.yaw=0;state.pitch=-.04;camera.fov=60;camera.updateProjectionMatrix();presence?.reset();keys.clear();time=0;}
function toggleLantern(){state.lantern=!state.lantern;lantern.intensity=state.lantern?13:0;$('lantern').textContent=state.lantern?'灯り：入':'灯り：切';$('lantern').setAttribute('aria-pressed',String(state.lantern));}
function togglePause(){state.paused=!state.paused;keys.clear();state.dragging=false;if(state.paused)document.exitPointerLock();$('pause').textContent=state.paused?'再開':'一時停止';$('pause').setAttribute('aria-pressed',String(state.paused));$('pause-note').classList.toggle('hidden',!state.paused);ambience.setPaused(simulationPaused());}
function closeModal(){ $('reference-modal').classList.add('hidden');$('reference').focus();}
renderer.domElement.addEventListener('pointerdown',e=>{if(simulationPaused()||document.pointerLockElement)return;state.dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.focus();});
renderer.domElement.addEventListener('pointermove',e=>{if(simulationPaused()||(!state.dragging&&!document.pointerLockElement))return;const dx=document.pointerLockElement?e.movementX:e.clientX-lastX,dy=document.pointerLockElement?e.movementY:e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;state.yaw-=dx*.0024;state.pitch=THREE.MathUtils.clamp(state.pitch-dy*.0024,-1.1,1.1);});
renderer.domElement.addEventListener('pointerup',()=>state.dragging=false);renderer.domElement.addEventListener('pointercancel',()=>state.dragging=false);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();if(simulationPaused())return;camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.02,35,85);camera.updateProjectionMatrix();},{passive:false});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(modalOpen())closeModal();$('panel').classList.add('hidden');$('settings').setAttribute('aria-expanded','false');return;}
 if(e.code==='KeyP'&&!e.repeat&&!['INPUT','SELECT'].includes((e.target as HTMLElement).tagName)){togglePause();return;}
 if(['INPUT','SELECT','BUTTON'].includes((e.target as HTMLElement).tagName)||modalOpen())return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 if(e.code==='KeyH'&&!e.repeat){state.hidden=!state.hidden;document.body.classList.toggle('clean',state.hidden);}
 if(e.code==='KeyF'&&!e.repeat)toggleLantern();
 if(e.code==='KeyR'&&!e.repeat)reset();
 if(!simulationPaused())keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();state.dragging=false;});
document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();ambience.setPaused(simulationPaused());});
$('walk').onclick=async()=>{if(state.paused)togglePause();$('panel').classList.add('hidden');$('settings').setAttribute('aria-expanded','false');renderer.domElement.focus();try{await renderer.domElement.requestPointerLock();}catch{toast('ドラッグと WASD でも森を歩けます。');}};
document.addEventListener('pointerlockchange',()=>{state.walking=!!document.pointerLockElement;state.dragging=false;$('crosshair').classList.toggle('hidden',!state.walking);$('walk').textContent=state.walking?'Esc で解除':'森を歩く ↗';});
$('reset').onclick=()=>{reset();renderer.domElement.focus();};$('lantern').onclick=toggleLantern;$('pause').onclick=togglePause;
$('audio').onclick=async()=>{try{const enabled=await ambience.toggle();$('audio').textContent=enabled?'音：入':'音：切';$('audio').setAttribute('aria-pressed',String(enabled));ambience.setPaused(simulationPaused());}catch{toast('このブラウザで音声を開始できませんでした。');}};
$('settings').onclick=()=>{const hidden=$('panel').classList.toggle('hidden');$('settings').setAttribute('aria-expanded',String(!hidden));keys.clear();if(!hidden)document.exitPointerLock();};
$('reference').onclick=()=>{document.exitPointerLock();keys.clear();$('reference-modal').classList.remove('hidden');$('close-reference').focus();};$('close-reference').onclick=closeModal;
$('reference-modal').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();$('close-reference').focus();}});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('全画面にする場合はブラウザの F11 を使用してください。');}};
for(const id of ['light','fog','wind'])$(id).addEventListener('input',()=>{const value=Number($<HTMLInputElement>(id).value);$(id+'-value').textContent=value+'%';if(id==='light')renderer.toneMappingExposure=value/100*.9;if(id==='fog')(scene.fog as THREE.FogExp2).density=.018+value*.0004;if(id==='wind'&&forest)forest.mats.uniforms.wind.value=value/100;});
$('quality').addEventListener('change',()=>{const high=$<HTMLSelectElement>('quality').value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.5:1));composer.setPixelRatio(renderer.getPixelRatio());forest.setDensity(high?'high':'medium');renderer.shadowMap.needsUpdate=true;resize();});
$('capture').onclick=()=>{composer.render();renderer.domElement.toBlob(blob=>{if(!blob){toast('画像の書き出しに失敗しました。');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.download='幽緑-気配.png';a.href=url;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('画像を書き出しました。');},'image/png');};
for(const [id,code] of [['forward','KeyW'],['backward','KeyS']]){const b=$(id);b.onpointerdown=e=>{if(!simulationPaused())keys.add(code);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=()=>keys.delete(code);}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);}window.addEventListener('resize',resize);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();state.ready=false;ambience.setPaused(true);$('loading').classList.remove('hidden');$('loading').innerHTML='描画を一時停止しました<small>GPU の復帰を待っています</small>';});renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
const direction=new THREE.Vector3();
function frame(now:number){
 requestAnimationFrame(frame);const realDt=(now-last)/1000,dt=Math.min(realDt,.05);last=now;if(!state.ready||document.hidden)return;
 const paused=simulationPaused();if(!paused){
  time+=dt;
  const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const length=Math.hypot(forward,side)||1,speed=keys.has('ShiftLeft')?3.4:1.65;
  const nx=THREE.MathUtils.clamp(state.x+(-Math.sin(state.yaw)*forward+Math.cos(state.yaw)*side)/length*speed*dt,-22,22);
  const nz=THREE.MathUtils.clamp(state.z+(-Math.cos(state.yaw)*forward-Math.sin(state.yaw)*side)/length*speed*dt,-27,17);
  if(!forest.treeBases.some(t=>Math.hypot(nx-t.x,nz-t.z)<t.r+.32)){state.x=nx;state.z=nz;}
 }
 camera.position.set(state.x,heightAt(state.x,state.z)+1.48,state.z);camera.rotation.set(state.pitch,state.yaw,0,'YXZ');camera.updateMatrixWorld();
 presence.update(dt,camera,state,paused);forest.mats.uniforms.time.value=reduced?0:time;
 camera.getWorldDirection(direction);lantern.position.copy(camera.position).addScaledVector(direction,.2);lantern.position.y-=.12;lantern.target.position.copy(camera.position).addScaledVector(direction,12);
 const dx=presence.state.x-state.x,dz=presence.state.z-state.z;
 ambience.update(dt,paused,(dx*Math.cos(state.yaw)-dz*Math.sin(state.yaw))/(Math.hypot(dx,dz)||1));
 composer.render();frames++;elapsed+=realDt;times.push(realDt*1000);if(times.length>240)times.shift();
 if(elapsed>=1){fps=Math.round(frames/elapsed);$('stats').textContent=`${fps} fps · ${forest.stats.trees} 本の木 · ${forest.stats.leaves.toLocaleString()} 枚の立体葉`;frames=0;elapsed=0;}
 // DOM-backed diagnostics support read-only verification without exposing game controls.
 if(debugNode)debugNode.textContent=JSON.stringify({camera:{x:state.x,z:state.z,yaw:state.yaw},presence:presence.diagnostic(),paused,light:state.lantern,fps});
}
const debugNode=new URLSearchParams(location.search).has('inspect')?document.createElement('output'):null;
if(debugNode){debugNode.id='forest-inspection';debugNode.hidden=true;document.body.appendChild(debugNode);}
requestAnimationFrame(frame);
async function start(){
 await new Promise(r=>setTimeout(r,40));forest=buildForest(scene);await loadScans(scene,renderer,forest.mats);
 // Retain the HDRI only as low-level indirect light. The far horizon stays dark.
 scene.background=new THREE.Color(0x142322);scene.environmentIntensity=.17;
 scene.traverse(object=>{if(object instanceof THREE.Mesh){const materials=Array.isArray(object.material)?object.material:[object.material];for(const m of materials)if(m instanceof THREE.MeshStandardMaterial)m.emissiveIntensity=Math.min(m.emissiveIntensity,.035);}});
 presence=createPresenceView(scene,forest.treeBases);renderer.shadowMap.needsUpdate=true;
 forest.mats.uniforms.wind.value=reduced?0:.2;if(reduced){$<HTMLInputElement>('wind').value='0';$('wind-value').textContent='0%';}
 state.ready=true;$('loading').classList.add('hidden');last=performance.now();
}
start().catch(error=>{console.error(error);$('loading').innerHTML='森の読み込みに失敗しました<small>ページを再読み込みしてください。</small>';});
