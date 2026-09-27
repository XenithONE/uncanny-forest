import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {createMaterials,rng} from './materials';

export const heightAt=(x:number,z:number)=>Math.sin(x*.17)*.42+Math.cos(z*.15)*.34+Math.sin(x*.38+z*.21)*.18;
const up=new THREE.Vector3(0,1,0);
function leafGeometry(segments=9){const p:number[]=[],uv:number[]=[],idx:number[]=[];
 for(let i=0;i<=segments;i++){const t=i/segments;const w=Math.pow(Math.sin(t*Math.PI),.8)*.28;for(let j=0;j<3;j++){const side=j-1;p.push(side*w,t,Math.sin(t*Math.PI)*.11-Math.abs(side)*w*.24);uv.push(j/2,t);}}
 for(let i=0;i<segments;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+3;idx.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
function tube(points:THREE.Vector3[],r:number,segments=14,sides=7){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),segments,r,sides,false);}
function fernGeometry(){const small=leafGeometry(4);const parts:THREE.BufferGeometry[]=[];const o=new THREE.Object3D();
 for(let k=0;k<22;k++){const t=.07+k*.041;const center=new THREE.Vector3(0,t*1.4,Math.pow(t,1.65)*1.65);const len=Math.sin(Math.pow(t,.7)*Math.PI)*.44+.035;for(const side of [-1,1]){o.position.copy(center);const dir=new THREE.Vector3(side*.94,.15,.38).normalize();o.quaternion.setFromUnitVectors(up,dir);o.scale.set(len*.55,len, len);o.updateMatrix();parts.push(small.clone().applyMatrix4(o.matrix));}}
 const pts=Array.from({length:15},(_,i)=>{const t=i/14;return new THREE.Vector3(0,t*1.4,Math.pow(t,1.65)*1.65)});parts.push(tube(pts,.008,18,4));const merged=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());small.dispose();return merged;}

export function buildForest(scene:THREE.Scene){
 const random=rng(921735),rand=(a:number,b:number)=>a+(b-a)*random();const mats=createMaterials();
 const groundGeometry=new THREE.PlaneGeometry(110,110,140,140);groundGeometry.rotateX(-Math.PI/2);const pos=groundGeometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,heightAt(pos.getX(i),pos.getZ(i)));groundGeometry.computeVertexNormals();const ground=new THREE.Mesh(groundGeometry,mats.ground);ground.receiveShadow=true;scene.add(ground);
 const woodParts:THREE.BufferGeometry[]=[], vineParts:THREE.BufferGeometry[]=[];
 const treeBases:{x:number,z:number,r:number}[]=[];const mossTransforms:THREE.Matrix4[]=[];const obj=new THREE.Object3D();
 function mossAt(x:number,y:number,z:number,scale:number){obj.position.set(x,y,z);obj.rotation.set(rand(0,7),rand(0,7),rand(0,7));obj.scale.set(scale,scale*.5,scale*.8);obj.updateMatrix();mossTransforms.push(obj.matrix.clone());}
 function tree(x:number,z:number,radius:number,h:number){const y=heightAt(x,z);treeBases.push({x,z,r:radius});const leanX=rand(-1.4,1.4),leanZ=rand(-1.4,1.4);const g=new THREE.CylinderGeometry(radius*.52,radius,h,20,24,true);const a=g.attributes.position;for(let i=0;i<a.count;i++){const t=(a.getY(i)+h*.5)/h;const theta=Math.atan2(a.getZ(i),a.getX(i));const flare=1+Math.pow(1-t,7)*(.4+.3*Math.cos(theta*5))+.07*Math.sin(theta*7+t*20)+.035*Math.sin(theta*13-t*37);a.setXYZ(i,a.getX(i)*flare+Math.sin(t*3)*leanX+x,a.getY(i)+h*.5+y,a.getZ(i)*flare+Math.sin(t*2)*leanZ+z);}g.computeVertexNormals();woodParts.push(g);
  for(let k=0;k<6;k++){const angle=rand(0,7),len=radius*rand(2.6,5.5),dx=Math.cos(angle),dz=Math.sin(angle);const endX=x+dx*len,endZ=z+dz*len;woodParts.push(tube([new THREE.Vector3(x,y+radius*.8,z),new THREE.Vector3(x+dx*len*.4,y+radius*.16,z+dz*len*.4),new THREE.Vector3(endX,heightAt(endX,endZ)+.025,endZ)],radius*rand(.12,.25),9,7));}
  for(let k=0;k<3;k++){const by=y+h*rand(.55,.88),angle=rand(0,7),length=rand(2.4,5);woodParts.push(tube([new THREE.Vector3(x,by,z),new THREE.Vector3(x+Math.cos(angle)*length*.5,by+1.3,z+Math.sin(angle)*length*.5),new THREE.Vector3(x+Math.cos(angle)*length,by+rand(1.2,3.2),z+Math.sin(angle)*length)],radius*.23,10,7));}
  for(let k=0;k<40;k++){const angle=rand(0,7),hh=rand(0,h*.85);mossAt(x+Math.cos(angle)*radius*.97+Math.sin(hh/h*3)*leanX,y+hh,z+Math.sin(angle)*radius*.97+Math.sin(hh/h*2)*leanZ,rand(.025,.095)*radius);}
  if(random()>.45){const angle=rand(0,7),points=[];for(let k=0;k<25;k++){const t=k/24;points.push(new THREE.Vector3(x+Math.cos(t*10+angle)*radius*1.1,y+t*h*.85,z+Math.sin(t*10+angle)*radius*1.1));}vineParts.push(tube(points,.023,45,5));}
 }
 tree(-3.7,1.5,1.3,18);tree(5,-4,.8,20);tree(-6,-9,.85,22);tree(3,-17,.8,20);
 for(let i=0;i<145;i++){const x=rand(-43,43),z=rand(-46,30);if(Math.hypot(x,z-9)<9||Math.hypot(x,z)<6)continue;tree(x,z,rand(.24,.72),rand(13,25));}
 // The diagonal, moss-covered fallen trunk establishes the reference composition.
 // The foreground fallen trunk is a photogrammetry mesh loaded in scans.ts.
 const wood=new THREE.Mesh(mergeGeometries(woodParts)!,mats.wood);wood.castShadow=true;wood.receiveShadow=true;scene.add(wood);woodParts.forEach(g=>g.dispose());
 if(vineParts.length){scene.add(new THREE.Mesh(mergeGeometries(vineParts)!,mats.vine));vineParts.forEach(g=>g.dispose());}
 const moss=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),mats.moss,mossTransforms.length);mossTransforms.forEach((m,i)=>{moss.setMatrixAt(i,m);moss.setColorAt(i,new THREE.Color().setHSL(rand(.19,.27),rand(.35,.65),rand(.2,.43)));});moss.receiveShadow=true;scene.add(moss);
 const fernMatrices:THREE.Matrix4[]=[],leafMatrices:THREE.Matrix4[]=[],leafColors:THREE.Color[]=[];
 function addLeaf(p:THREE.Vector3,dir:THREE.Vector3,size:number,width:number,color:THREE.Color){obj.position.copy(p);obj.quaternion.setFromUnitVectors(up,dir.normalize());obj.rotateY(rand(-.5,.5));obj.scale.set(size*width,size,size);obj.updateMatrix();leafMatrices.push(obj.matrix.clone());leafColors.push(color);}
 function fern(x:number,z:number,size:number){for(let k=0;k<8;k++){obj.position.set(x,heightAt(x,z)+.02,z);obj.rotation.set(rand(-.12,.12),k*Math.PI/4+rand(-.22,.22),rand(-.12,.12));obj.scale.setScalar(size*rand(.75,1.15));obj.updateMatrix();fernMatrices.push(obj.matrix.clone());}}
 for(let i=0;i<390;i++){const x=rand(-32,32),z=rand(-35,19);if(Math.hypot(x,z-6)<16)continue;fern(x,z,rand(.35,.85));}
 const fernMesh=new THREE.InstancedMesh(fernGeometry(),mats.fern,fernMatrices.length);fernMatrices.forEach((m,i)=>{fernMesh.setMatrixAt(i,m);fernMesh.setColorAt(i,new THREE.Color().setHSL(rand(.19,.29),rand(.3,.55),rand(.4,.67)));});fernMesh.receiveShadow=true;scene.add(fernMesh);
 // Broad understory rosettes: actual curved leaves, not camera-facing cards.
 for(let i=0;i<1500;i++){let x=rand(-39,39),z=rand(-40,23);if(Math.hypot(x,z-6)<12)continue;const size=rand(.25,.65),y=heightAt(x,z)+rand(.08,.35);for(let k=0;k<7;k++){const angle=k*6.283/7+random(),len=size*rand(.8,1.5);addLeaf(new THREE.Vector3(x,y,z),new THREE.Vector3(Math.cos(angle),rand(.25,.85),Math.sin(angle)),len,rand(.6,1.2),new THREE.Color().setHSL(rand(.20,.30),rand(.25,.6),rand(.35,.65)));}}
 // Large wet foreground leaves.
 // Near-camera broad leaves are supplied by the scanned anthurium models.
 // Mid-story clusters and a closed, layered canopy.
 const twigParts:THREE.BufferGeometry[]=[];
 for(let i=0;i<1300;i++){const base=treeBases[Math.floor(random()*treeBases.length)],x=base.x,z=base.z,y=rand(6,18),angle=rand(0,7),length=rand(2,5);const end=new THREE.Vector3(x+Math.cos(angle)*length,y+rand(-.7,1.5),z+Math.sin(angle)*length);twigParts.push(tube([new THREE.Vector3(x,y,z),new THREE.Vector3((x+end.x)*.5,y+.4,(z+end.z)*.5),end],rand(.012,.045),5,4));for(let j=0;j<28;j++){const t=rand(.25,1),a=angle+(j%2===0?1:-1);addLeaf(new THREE.Vector3(THREE.MathUtils.lerp(x,end.x,t),THREE.MathUtils.lerp(y,end.y,t),THREE.MathUtils.lerp(z,end.z,t)),new THREE.Vector3(Math.cos(a),rand(-.15,.55),Math.sin(a)),rand(.25,.65),rand(.65,1.15),new THREE.Color().setHSL(rand(.20,.3),rand(.3,.55),rand(.45,.7)));}}
 const twigs=new THREE.Mesh(mergeGeometries(twigParts)!,mats.wood);twigs.castShadow=true;scene.add(twigs);twigParts.forEach(g=>g.dispose());
 const leaves=new THREE.InstancedMesh(leafGeometry(),mats.leaves,leafMatrices.length);leafMatrices.forEach((m,i)=>{leaves.setMatrixAt(i,m);leaves.setColorAt(i,leafColors[i]);});leaves.receiveShadow=true;leaves.castShadow=true;scene.add(leaves);
 // Fine grasses fill small gaps between ferns.
 const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.016,0,0,.016,0,0,.01,.4,.07,0,.75,.2],3));grassGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.8,.6,.5,1],2));grassGeo.setIndex([0,1,2,0,2,3]);grassGeo.computeVertexNormals();const grass=new THREE.InstancedMesh(grassGeo,mats.fern,20000);for(let i=0;i<grass.count;i++){const x=rand(-38,38),z=rand(-40,25);obj.position.set(x,heightAt(x,z),z);obj.rotation.set(0,rand(0,7),rand(-.2,.2));obj.scale.setScalar(rand(.4,1.4));obj.updateMatrix();grass.setMatrixAt(i,obj.matrix);grass.setColorAt(i,new THREE.Color().setHSL(.23,.38,rand(.35,.6)));}grass.receiveShadow=true;scene.add(grass);
 return {mats,treeBases,stats:{trees:treeBases.length,leaves:leafMatrices.length,fronds:fernMatrices.length,grass:grass.count,moss:moss.count},setDensity(value:string){const f=value==='high'?1:.62;leaves.count=Math.floor(leafMatrices.length*f);fernMesh.count=Math.floor(fernMatrices.length*f);grass.count=Math.floor(20000*f);}};
}
