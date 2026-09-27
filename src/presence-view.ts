import * as THREE from 'three';
import {heightAt} from './forest';
import {createPresence,updatePresence,inView,type Tree,type Observer} from './stalker';

export function createPresenceView(scene:THREE.Scene,trees:Tree[]){
  const state=createPresence(),root=new THREE.Group();root.name='The quiet observer';
  const material=new THREE.MeshBasicMaterial({color:0x010303,transparent:true,opacity:0,depthWrite:true,fog:true});
  // An unlit, slightly disproportionate human silhouette. No luminous eyes.
  function ellipsoid(x:number,y:number,z:number,sx:number,sy:number,sz:number){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,14,18),material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);root.add(mesh);return mesh;
  }
  ellipsoid(0,1.93,0,.29,.74,.17);
  ellipsoid(0,2.56,0,.092,.2,.095);
  const head=ellipsoid(.035,2.91,0,.16,.28,.145);head.rotation.z=-.11;
  const shoulder=ellipsoid(0,2.34,0,.42,.16,.18);shoulder.rotation.z=.04;
  const leftArm=ellipsoid(-.37,1.65,.025,.085,.78,.09);leftArm.rotation.z=-.075;
  const rightArm=ellipsoid(.37,1.62,.045,.08,.81,.09);rightArm.rotation.z=.095;
  ellipsoid(-.44,.87,.025,.065,.13,.065);ellipsoid(.45,.79,.035,.06,.15,.06);
  const leftLeg=ellipsoid(-.14,.71,0,.10,.73,.105);leftLeg.rotation.z=-.025;
  const rightLeg=ellipsoid(.13,.72,.025,.095,.73,.10);rightLeg.rotation.z=.025;
  scene.add(root);
  const target=new THREE.Vector3(),delta=new THREE.Vector3();
  let lastView={inView:false,watched:false};

  function perception(camera:THREE.PerspectiveCamera,observer:Observer){
    const dx=state.x-observer.x,dz=state.z-observer.z,d=Math.hypot(dx,dz);
    const halfHorizontal=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)+.24;
    const visible=inView(observer,state.x,state.z,halfHorizontal);
    let occluded=false;
    for(const t of trees){
      const u=((t.x-observer.x)*dx+(t.z-observer.z)*dz)/(d*d);
      if(u<.06||u>.97)continue;
      if(Math.hypot(observer.x+dx*u-t.x,observer.z+dz*u-t.z)<t.r*.7){occluded=true;break;}
    }
    target.set(state.x,heightAt(state.x,state.z)+2.6,state.z);
    delta.copy(target).sub(camera.position).normalize();
    const direction=camera.getWorldDirection(new THREE.Vector3());
    return {inView:visible&&!occluded,watched:visible&&!occluded&&direction.dot(delta)>.982};
  }

  return {
    state,
    update(dt:number,camera:THREE.PerspectiveCamera,observer:Observer,paused:boolean){
      lastView=perception(camera,observer);
      // Even when hidden behind a tree, never teleport into the viewport.
      const movementView={...lastView,inView:inView(observer,state.x,state.z,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)+.3)};
      updatePresence(state,observer,movementView,trees,dt,paused);
      lastView=perception(camera,observer);
      root.position.set(state.x,heightAt(state.x,state.z),state.z);
      root.rotation.y=Math.atan2(observer.x-state.x,observer.z-state.z);
      root.rotation.z=.008*Math.sin(state.age*.23);
      head.rotation.z=-.11+.035*Math.sin(state.age*.19);
      material.opacity=state.opacity;root.visible=state.opacity>.003;
    },
    reset(){Object.assign(state,createPresence());},
    diagnostic(){return {...state,...lastView};},
  };
}
