import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {heightAt} from './forest';
import {rng,createMaterials} from './materials';

type Placement={x:number,z:number,scale:number,y?:number,tilt?:number};
export async function loadScans(scene:THREE.Scene,renderer:THREE.WebGLRenderer,mats:ReturnType<typeof createMaterials>){
 const textures=new THREE.TextureLoader(),loader=new GLTFLoader(),random=rng(78912),rand=(a:number,b:number)=>a+(b-a)*random();
 async function pbr(id:string,material:THREE.MeshStandardMaterial,rx:number,ry:number){
  const [map,normal,rough]=await Promise.all(['diff','nor_gl','rough'].map(k=>textures.loadAsync(`${import.meta.env.BASE_URL}assets/${id}/${k}.jpg`)));map.colorSpace=THREE.SRGBColorSpace;
  for(const t of [map,normal,rough]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=renderer.capabilities.getMaxAnisotropy();}
  material.map?.dispose();material.map=map;material.bumpMap=null;material.normalMap=normal;material.normalScale.set(.85,.85);material.roughnessMap=rough;material.roughness=.95;material.needsUpdate=true;
 }
 const environment=async()=>{const hdr=await new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}assets/mossy_forest.hdr`);const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;scene.environmentIntensity=.5;hdr.mapping=THREE.EquirectangularReflectionMapping;scene.background=hdr;scene.backgroundIntensity=.45;scene.backgroundBlurriness=.045;pmrem.dispose();};
 async function scatter(id:string,diameter:number,placements:Placement[],alphaMask:boolean,color:number){
  const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/${id}/${id}.gltf`);const meshes:THREE.Mesh[]=[];gltf.scene.traverse(c=>{if(c instanceof THREE.Mesh)meshes.push(c);});
  const alpha=alphaMask?await textures.loadAsync(`${import.meta.env.BASE_URL}assets/${id}/alpha.png`):null;if(alpha){alpha.flipY=false;alpha.anisotropy=8;}
  meshes.forEach((source,variant)=>{
   const geo=source.geometry.clone();geo.computeBoundingBox();const box=geo.boundingBox!,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());geo.translate(-center.x,-box.min.y,-center.z);const scale=diameter/Math.max(size.x,size.z);geo.scale(scale,scale,scale);
   const mat=(source.material as THREE.MeshStandardMaterial).clone();mat.side=THREE.DoubleSide;mat.transparent=false;mat.alphaTest=alpha?.35:0;mat.alphaMap=alpha;mat.color.setHex(color);mat.roughness=.9;mat.metalness=0;mat.emissive.setHex(0x192511);mat.emissiveIntensity=.15;mat.emissiveMap=mat.map;mat.envMapIntensity=.12;mat.normalScale.set(.3,.3);if(mat.map)mat.map.anisotropy=8;
   mat.onBeforeCompile=shader=>{shader.uniforms.uForestTime=mats.uniforms.time;shader.uniforms.uForestWind=mats.uniforms.wind;shader.vertexShader='uniform float uForestTime; uniform float uForestWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
     float phase = uForestTime * 0.8 + instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.4;
     transformed.x += sin(phase + position.y) * 0.018 * uForestWind * max(position.y, 0.0);
   #endif`);};
   const chosen=placements.filter((_,i)=>i%meshes.length===variant);if(!chosen.length)return;const instances=new THREE.InstancedMesh(geo,mat,chosen.length),obj=new THREE.Object3D();
   chosen.forEach((p,i)=>{obj.position.set(p.x,p.y??heightAt(p.x,p.z)-.035,p.z);obj.rotation.set(rand(-.05,.05)+(p.tilt??0),rand(0,7),rand(-.07,.07));obj.scale.setScalar(p.scale);obj.updateMatrix();instances.setMatrixAt(i,obj.matrix);instances.setColorAt(i,new THREE.Color().setHSL(rand(.22,.27),rand(.02,.10),rand(.83,.99)));});
   instances.castShadow=id!=='moss_01';instances.receiveShadow=true;scene.add(instances);
  });
 }
 const fernPlants:Placement[]=[{x:1.8,z:6,scale:1.25},{x:-2.1,z:5.7,scale:1.05},{x:3.5,z:2,scale:1.3},{x:-3.1,z:0,scale:1.1},{x:.2,z:-2,scale:1.2}];
 for(let i=0;i<600;i++){const x=rand(-28,28),z=rand(-32,19);if(Math.hypot(x,z-9)<1.7)continue;fernPlants.push({x,z,scale:rand(.55,1.25)});}
 for(let i=0;i<70;i++){const x=rand(-8,8),z=rand(-10,7);if(Math.hypot(x,z-9)<2)continue;fernPlants.push({x,z,scale:rand(.7,1.25)});}
 const broadPlants:Placement[]=[{x:-1.5,z:7.6,scale:1.5},{x:3,z:6,scale:1.4},{x:4.1,z:2,scale:1.6},{x:-4,z:2,scale:1.1}];for(let i=0;i<190;i++){const x=rand(-24,24),z=rand(-28,17);if(Math.hypot(x,z-9)<2)continue;broadPlants.push({x,z,scale:rand(.6,1.3)});}
 const shrubs:Placement[]=[];for(let i=0;i<110;i++){const x=rand(-32,32),z=rand(-38,19);if(Math.hypot(x,z-9)<8)continue;shrubs.push({x,z,scale:rand(.7,1.6)});}
 for(let i=0;i<70;i++){const x=rand(-26,26),z=rand(-27,15);shrubs.push({x,z,y:rand(3.7,8),scale:rand(1.3,2.1),tilt:.6});}
 const mossPlants:Placement[]=[];for(let i=0;i<200;i++){const x=rand(-13,13),z=rand(-18,8);mossPlants.push({x,z,scale:rand(.45,1.25)});}
 for(let i=0;i<24;i++){const t=rand(-3.5,3.5);mossPlants.push({x:-2+Math.cos(.95)*t,z:3-Math.sin(.95)*t,y:.68,scale:rand(.25,.5)});}
 const trunk=async()=>{const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/dead_tree_trunk/dead_tree_trunk.gltf`);const model=gltf.scene;const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.setScalar(8.5/Math.max(size.x,size.y,size.z));model.position.set(-2,heightAt(-2,3)+.15,3);model.rotation.y=.95;model.traverse(c=>{if(c instanceof THREE.Mesh){c.castShadow=true;c.receiveShadow=true;(c.material as THREE.MeshStandardMaterial).color.setHex(0x9eaa7a);}});scene.add(model);};
 await Promise.all([pbr('moss_wood',mats.wood,1.7,5),pbr('forest_floor',mats.ground,38,38),environment(),scatter('fern_02',2.3,fernPlants,true,0xf1efd1),scatter('anthurium_botany_01',1.5,broadPlants,true,0xd6ddbd),scatter('shrub_04',3.4,shrubs,true,0x9bac86),scatter('moss_01',.75,mossPlants,true,0x91aa59),trunk()]);
 mats.ground.color.setHex(0x313519);mats.ground.envMapIntensity=0;mats.ground.normalScale.set(.35,.35);mats.wood.color.setHex(0xb8b69c);
}
