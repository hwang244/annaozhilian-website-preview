import * as THREE from '../experiments/brain-comparison/option-a/vendor/three.module.js';
export function buildCurveRecipes(p,n,faces){
 const neighbors=Array.from({length:p.length/3},()=>new Set());
 for(let i=0;i<faces.length;i+=3){const[a,b,c]=faces.subarray(i,i+3);neighbors[a].add(b).add(c);neighbors[b].add(a).add(c);neighbors[c].add(a).add(b);}
 const position=i=>new THREE.Vector3().fromArray(p,i*3),normal=i=>new THREE.Vector3().fromArray(n,i*3);
 let seed=714391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
// Smooth flow paths follow the least-bending direction of each local surface patch.
const directions = [];
for (let i = 0; i < neighbors.length; i++) {
  const origin = position(i), ni = normal(i);
  const u = new THREE.Vector3(0,1,0).cross(ni);
  if (u.lengthSq() < 0.01) u.set(1,0,0).cross(ni);
  u.normalize(); const v = ni.clone().cross(u);
  let xx=0, xy=0, yy=0, ax=0, ay=0, bx=0, by=0;
  for (const j of neighbors[i]) {
    const delta = position(j).sub(origin), dn = normal(j).sub(ni);
    const x = delta.dot(u), y = delta.dot(v), a=dn.dot(u), b=dn.dot(v);
    xx+=x*x; xy+=x*y; yy+=y*y; ax+=a*x; ay+=a*y; bx+=b*x; by+=b*y;
  }
  const det = xx*yy-xy*xy;
  if (det < 1e-14) { directions.push(u); continue; }
  const s11=(ax*yy-ay*xy)/det, s22=(by*xx-bx*xy)/det;
  const s12=((ay*xx-ax*xy)+(bx*yy-by*xy))/(2*det);
  const theta=0.5*Math.atan2(2*s12,s11-s22);
  const d1=u.clone().multiplyScalar(Math.cos(theta)).addScaledVector(v,Math.sin(theta));
  const d2=ni.clone().cross(d1);
  const k1=s11*Math.cos(theta)**2+2*s12*Math.sin(theta)*Math.cos(theta)+s22*Math.sin(theta)**2;
  const k2=s11+s22-k1;
  directions.push(Math.abs(k1)<Math.abs(k2)?d1:d2);
}
const curveIds=[],curveLengths=[],curveBrightness=[];
for (let strand = 0; strand < 1200; strand++) {
  let current = Math.floor(random()*neighbors.length);
  let dir = directions[current].clone().multiplyScalar(random()<0.5?-1:1);
  const path=[], normals=[], visited=new Set(),pathIds=[];
  for (let step = 0; step < 28 + strand % 34; step++) {
    visited.add(current);pathIds.push(current);
    const ni = normal(current), point = position(current).addScaledVector(ni, 0.009);
    path.push(point); normals.push(ni);
    let best=-1, bestScore=-Infinity;
    const origin=position(current);
    for (const j of neighbors[current]) {
      if(visited.has(j)) continue;
      const delta=position(j).sub(origin).normalize();
      const score=delta.dot(dir) + Math.abs(delta.dot(directions[j]))*0.24 + random()*0.12;
      if(score>bestScore){best=j;bestScore=score;}
    }
    if(best<0 || bestScore<0.05) break;
    const heading=position(best).sub(origin).normalize();
    const preferred=directions[best].clone();
    if(preferred.dot(heading)<0) preferred.negate();
    dir.copy(heading).lerp(preferred,0.45).normalize(); current=best;
  }
  if(path.length<6)continue;
  const brightness = 0.16 + random() ** 3 * 0.6;
  curveIds.push(...pathIds);curveLengths.push(pathIds.length);curveBrightness.push(brightness);
}
return {curveIds:new Uint32Array(curveIds),curveLengths:new Uint32Array(curveLengths),curveBrightness:new Float32Array(curveBrightness)};
}
