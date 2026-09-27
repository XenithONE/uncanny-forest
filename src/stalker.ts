/** The presence has no attack state, damage, collision or chase speed. */
export const MIN_DISTANCE = 8;
export type Tree = { x: number; z: number; r: number };
export type Observer = { x: number; z: number; yaw: number };
export type Perception = { inView: boolean; watched: boolean };
export type Presence = {
  x: number; z: number; opacity: number;
  mode: 'watching' | 'following' | 'withdrawing' | 'hidden';
  watchedFor: number; unseenFor: number; hiddenFor: number;
  age: number; encounters: number;
};

export function createPresence(): Presence {
  return {x:3.85,z:-4.3,opacity:0,mode:'watching',watchedFor:0,unseenFor:0,hiddenFor:0,age:0,encounters:0};
}

export function inView(observer: Observer, x: number, z: number, halfFov: number) {
  const dx=x-observer.x,dz=z-observer.z,d=Math.hypot(dx,dz)||1;
  return (dx*-Math.sin(observer.yaw)+dz*-Math.cos(observer.yaw))/d > Math.cos(halfFov);
}

function nextCover(observer: Observer, trees: Tree[], encounter: number) {
  const candidates: {x:number;z:number;score:number}[]=[];
  for(const tree of trees){
    const dx=observer.x-tree.x,dz=observer.z-tree.z,len=Math.hypot(dx,dz)||1;
    const side=encounter%2===0?1:-1;
    const x=tree.x+dz/len*(tree.r+.55)*side, z=tree.z-dx/len*(tree.r+.55)*side;
    const d=Math.hypot(x-observer.x,z-observer.z);
    // Relocations are restricted to the rear half-space even with a wide FOV.
    if(d>=10.5&&d<21&&!inView(observer,x,z,Math.PI*.63))
      candidates.push({x,z,score:Math.abs(d-13)});
  }
  candidates.sort((a,b)=>a.score-b.score);
  return candidates[encounter%Math.min(3,candidates.length)] ?? {
    x:observer.x+Math.sin(observer.yaw)*13,
    z:observer.z+Math.cos(observer.yaw)*13,
  };
}

export function updatePresence(p: Presence, observer: Observer, view: Perception, trees: Tree[], delta: number, paused=false) {
  if(paused)return;
  const dt=Math.min(Math.max(delta,0),.1);
  p.age+=dt;
  const distance=Math.hypot(p.x-observer.x,p.z-observer.z);
  p.watchedFor=view.watched?p.watchedFor+dt:Math.max(0,p.watchedFor-dt*.6);
  p.unseenFor=view.inView?0:p.unseenFor+dt;

  // If the visitor approaches, the presence dissolves; it can never make contact.
  if(p.mode!=='hidden'&&distance<MIN_DISTANCE){p.opacity=0;p.mode='hidden';p.hiddenFor=0;}
  else if(p.mode!=='hidden'&&(distance<10.2||p.watchedFor>3.2))p.mode='withdrawing';

  if(p.mode==='withdrawing'){
    p.opacity=Math.max(0,p.opacity-dt*.48);
    if(p.opacity===0){p.mode='hidden';p.hiddenFor=0;}
    return;
  }
  if(p.mode==='hidden'){
    p.hiddenFor+=dt;
    if(p.hiddenFor>3.5){
      const cover=nextCover(observer,trees,p.encounters++);
      p.x=cover.x;p.z=cover.z;p.watchedFor=0;p.unseenFor=0;p.hiddenFor=0;p.mode='following';
    }
    return;
  }

  p.opacity=Math.min(.96,p.opacity+dt*.23);
  if(view.inView){p.mode='watching';return;}
  p.mode='following';
  if(distance>25&&p.unseenFor>2){p.mode='withdrawing';return;}
  if(p.unseenFor<.75)return;

  // Walk slowly into the visitor's wake, never rush toward the camera.
  const targetX=observer.x+Math.sin(observer.yaw)*12+Math.cos(observer.yaw)*2.5;
  const targetZ=observer.z+Math.cos(observer.yaw)*12-Math.sin(observer.yaw)*2.5;
  const dx=targetX-p.x,dz=targetZ-p.z,len=Math.hypot(dx,dz);
  if(len<.3)return;
  const step=Math.min(len,dt*.72),nx=p.x+dx/len*step,nz=p.z+dz/len*step;
  if(Math.hypot(nx-observer.x,nz-observer.z)<10.4)return;
  if(trees.some(t=>Math.hypot(nx-t.x,nz-t.z)<t.r+.3))return;
  p.x=nx;p.z=nz;
}
