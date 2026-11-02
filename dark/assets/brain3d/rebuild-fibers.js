import * as THREE from './vendor/three.module.js';
export function rebuildFibers(data,expected){
 const p=data.positions,n=data.normals,faces=data.indices,capacity=expected+65536;
 const fp=new Float32Array(capacity*3),fn=new Float32Array(capacity*3),fb=new Float32Array(capacity);let count=0;
 function segment(a,b,na,nb,brightness){if(count+2>capacity)throw Error('Fiber recipe capacity');fp.set(a,count*3);fp.set(b,(count+1)*3);fn.set(na,count*3);fn.set(nb,(count+1)*3);fb[count]=fb[count+1]=brightness;count+=2;}
 let cursor=0;
 for(let c=0;c<data.curveLengths.length;c++){
  const path=[],normals=[],length=data.curveLengths[c];for(let j=0;j<length;j++){const id=data.curveIds[cursor++],normal=new THREE.Vector3().fromArray(n,id*3);normals.push(normal);path.push(new THREE.Vector3().fromArray(p,id*3).addScaledVector(normal,.009));}
  const samples=new THREE.CatmullRomCurve3(path,false,'centripetal').getPoints(length*3);
  for(let i=1;i<samples.length;i++){const index=Math.min(length-1,Math.floor(i/(samples.length-1)*(length-1))),normal=normals[index].toArray();segment(samples[i-1].toArray(),samples[i].toArray(),normal,normal,data.curveBrightness[c]);}
 }
 for(let variant=0;variant<2;variant++){
  const spacing=variant===0?.009:.019,values=new Float64Array(p.length/3);
  for(let i=0;i<p.length;i+=3){const x=p[i],y=p[i+1],z=p[i+2];values[i/3]=variant===0?Math.hypot(x/1.03,(y-.28)/.93,(z-.10)/1.35)+.018*Math.sin(y*3+z*6):y*.5+z*.72+.08*Math.sin(x*4);}
  for(let face=0;face<faces.length;face+=3){const ids=[faces[face],faces[face+1],faces[face+2]],vals=ids.map(i=>values[i]);
   for(let level=Math.ceil(Math.min(...vals)/spacing)*spacing;level<Math.max(...vals);level+=spacing){const hits=[];
    for(let edge=0;edge<3;edge++){const a=edge,b=(edge+1)%3;if((vals[a]<=level&&vals[b]>level)||(vals[b]<=level&&vals[a]>level)){
     const t=(level-vals[a])/(vals[b]-vals[a]),ia=ids[a]*3,ib=ids[b]*3;let nx=n[ia]+(n[ib]-n[ia])*t,ny=n[ia+1]+(n[ib+1]-n[ia+1])*t,nz=n[ia+2]+(n[ib+2]-n[ia+2])*t;const norm=Math.hypot(nx,ny,nz)||1;nx/=norm;ny/=norm;nz/=norm;
     hits.push({p:[p[ia]+(p[ib]-p[ia])*t+nx*.003,p[ia+1]+(p[ib+1]-p[ia+1])*t+ny*.003,p[ia+2]+(p[ib+2]-p[ia+2])*t+nz*.003],n:[nx,ny,nz]});
    }}if(hits.length===2)segment(hits[0].p,hits[1].p,hits[0].n,hits[1].n,variant===0?.19:.045);
   }
  }
 }
 data.fiberPositions=fp.subarray(0,count*3);data.fiberNormals=fn.subarray(0,count*3);data.fiberBrightness=fb.subarray(0,count);
 delete data.curveIds;delete data.curveLengths;delete data.curveBrightness;return data;
}
