import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresence,updatePresence,inView,MIN_DISTANCE} from '../src/stalker.ts';
const observer={x:0,z:9,yaw:0};

test('a visible observer never advances or repositions',()=>{
 const p=createPresence(),position={x:p.x,z:p.z};
 for(let i=0;i<900;i++)updatePresence(p,observer,{inView:true,watched:false},[],1/60);
 assert.equal(p.x,position.x);assert.equal(p.z,position.z);assert.equal(p.mode,'watching');assert.ok(p.opacity>.9);
});
test('watching makes the silhouette withdraw before relocating behind the player',()=>{
 const p=createPresence();p.opacity=.96;let sawFade=false,sawHidden=false;
 for(let i=0;i<900;i++){
  const view={inView:inView(observer,p.x,p.z,1),watched:inView(observer,p.x,p.z,.6)};
  updatePresence(p,observer,view,[],1/60);
  sawFade ||= p.mode==='withdrawing';sawHidden ||= p.mode==='hidden';
 }
 assert.ok(sawFade&&sawHidden);assert.ok(!inView(observer,p.x,p.z,Math.PI/2));
 assert.ok(Math.hypot(p.x-observer.x,p.z-observer.z)>=MIN_DISTANCE);
});
test('offscreen following is slow and maintains separation',()=>{
 const p=createPresence();p.x=-10;p.z=22;p.opacity=.9;
 for(let i=0;i<900;i++){
  const x=p.x,z=p.z;
  updatePresence(p,observer,{inView:false,watched:false},[],1/60);
  assert.ok(Math.hypot(p.x-x,p.z-z)<=.72/60+1e-8);
  assert.ok(Math.hypot(p.x-observer.x,p.z-observer.z)>=MIN_DISTANCE);
 }
 assert.equal(p.mode,'following');
});
test('the player cannot make contact and hiding is not stuck at the old position',()=>{
 const p=createPresence();p.opacity=.9;const visitor={x:p.x,z:p.z,yaw:0};
 updatePresence(p,visitor,{inView:true,watched:true},[],1/60);
 assert.equal(p.opacity,0);assert.equal(p.mode,'hidden');
 for(let i=0;i<300;i++)updatePresence(p,visitor,{inView:false,watched:false},[],1/60);
 assert.ok(Math.hypot(p.x-visitor.x,p.z-visitor.z)>=MIN_DISTANCE);assert.notEqual(p.mode,'hidden');
});
test('pause freezes every timer, position and opacity',()=>{
 const p=createPresence(),before=structuredClone(p);
 for(let i=0;i<600;i++)updatePresence(p,observer,{inView:false,watched:false},[],1/60,true);
 assert.deepEqual(p,before);
});
test('extended turning and walking never yield a visible shadow inside the safety radius',()=>{
 const p=createPresence(),visitor={...observer};
 for(let i=0;i<18000;i++){
  visitor.yaw=Math.sin(i/380)*Math.PI;visitor.x=Math.sin(i/520)*20;visitor.z=9+Math.cos(i/670)*15;
  const onScreen=inView(visitor,p.x,p.z,1.2);
  updatePresence(p,visitor,{inView:onScreen,watched:inView(visitor,p.x,p.z,.2)},[],1/60);
  assert.ok(Number.isFinite(p.x+p.z+p.opacity));
  if(p.opacity>0)assert.ok(Math.hypot(p.x-visitor.x,p.z-visitor.z)>=MIN_DISTANCE);
 }
});
