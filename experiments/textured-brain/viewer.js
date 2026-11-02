import {reportFirstFrame} from '../shared/metrics.js';
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const stage=document.querySelector('.neural-stage');
const status=document.querySelector('.loading-note');
const tools=document.querySelector('.viewer-tools');
const presets=document.querySelector('.view-presets');
const embedded=new URLSearchParams(location.search).has('embed');
const initial=embedded?{x:.02,y:-1.02,z:-.04}:{x:.12,y:-1.05,z:0};
let reference=false,redraw=()=>{};
for(const button of document.querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
  reference=button.dataset.mode==='reference';
  stage.classList.toggle('show-reference',reference);
  tools.hidden=reference||stage.dataset.state!=='ready';
  presets.hidden=tools.hidden;
  for(const option of document.querySelectorAll('[data-mode]'))option.setAttribute('aria-pressed',String(option===button));
  redraw();
});

start().catch(error=>{
  stage.dataset.state='fallback';status.hidden=false;
  status.textContent='三维模型暂不可用。可先查看原图，或下载 GLB 模型。';
  console.error('Original-texture brain:',error);
});

async function start() {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene();
  const camera=embedded?new THREE.PerspectiveCamera(35,1,.1,30):new THREE.OrthographicCamera(-2,2,2,-2,.1,20);
  camera.position.set(0,embedded ? .12 : 0,embedded ? 6 : 7);camera.lookAt(0,0,0);
  const model=(await new GLTFLoader().loadAsync(new URL('./annobrain-neural-complete.glb?v=fine1',import.meta.url).href)).scene;
  model.traverse(node=>{
    if(node.isMesh) {
      node.material.toneMapped=false;
      if(node.material.map)node.material.map.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());
    }
  });
  scene.add(model);
  model.rotation.set(initial.x,initial.y,initial.z);
  const notifyPose=()=>{if(parent!==window)parent.postMessage({type:'brain-pose',pose:[model.rotation.x,model.rotation.y,model.rotation.z]},location.origin);};
  const canvas=renderer.domElement;
  canvas.tabIndex=0;canvas.setAttribute('role','slider');
  canvas.setAttribute('aria-label','旋转完整三维大脑，左右键转向，上下键查看顶部和底部');
  canvas.setAttribute('aria-valuemin','0');canvas.setAttribute('aria-valuemax','359');
  stage.prepend(canvas);stage.dataset.state='ready';status.hidden=true;tools.hidden=reference;presets.hidden=reference;
  const bounds=new THREE.Box3().setFromObject(model);
  stage.dataset.modelDepth=String(bounds.max.z-bounds.min.z);
  let pending=false;
  const render=()=>{
    const angle=Math.round((((model.rotation.y-initial.y)*180/Math.PI)%360+360)%360)%360;
    stage.dataset.angle=String(angle);canvas.setAttribute('aria-valuenow',String(angle));
    stage.dataset.pitch=String(Math.round(model.rotation.x*180/Math.PI));
    stage.dataset.yaw=String(Math.round(model.rotation.y*180/Math.PI));
    canvas.setAttribute('aria-valuetext',`转向 ${Math.round(model.rotation.y*180/Math.PI)}°，俯仰 ${Math.round(model.rotation.x*180/Math.PI)}°`);
    renderer.render(scene,camera);pending=false;reportFirstFrame(stage,'/annobrain-neural-complete.glb');
  };
  redraw=()=>{if(!pending){pending=true;requestAnimationFrame(render);}};
  new ResizeObserver(()=>{
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    renderer.setSize(width,height,false);
    const aspect=width/height;
    if(embedded){camera.aspect=aspect;camera.position.z=Math.max(4.8,4.5/aspect);camera.lookAt(0,0,0);}
    else {
      const viewHeight=Math.max(3.10,3.55/aspect);
      camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;
      camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    }
    camera.updateProjectionMatrix();redraw();
  }).observe(stage);
  let drag=null;
  canvas.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:null,touch:event.pointerType==='touch'};
    canvas.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(drag.horizontal===null){if(Math.max(Math.abs(dx),Math.abs(dy))<3)return;drag.horizontal=Math.abs(dx)>=Math.abs(dy);}
    if(drag.touch&&!drag.horizontal)return;
    model.rotation.y+=dx*2*Math.PI/Math.max(stage.clientWidth,360);
    if(!drag.touch)model.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,model.rotation.x+dy*Math.PI/Math.max(stage.clientHeight,320)));
    drag.x=event.clientX;drag.y=event.clientY;redraw();
    notifyPose();
  });
  const end=()=>{drag=null;stage.classList.remove('is-dragging');};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home')model.rotation.set(initial.x,initial.y,initial.z);
    else if(event.key==='ArrowUp'||event.key==='ArrowDown')model.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,model.rotation.x+(event.key==='ArrowDown'?1:-1)*Math.PI/12));
    else model.rotation.y+=(event.key==='ArrowRight'?1:-1)*Math.PI/12;
    redraw();
    notifyPose();
  });
  document.querySelector('.reset-view').addEventListener('click',()=>{model.rotation.set(initial.x,initial.y,initial.z);redraw();notifyPose();});
  const views={left:[0,-Math.PI/2],right:[0,Math.PI/2],front:[0,0],back:[0,Math.PI],top:[Math.PI/2,0],bottom:[-Math.PI/2,0]};
  for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
    const [x,y]=views[button.dataset.view];model.rotation.set(x,y,0);redraw();
    notifyPose();
  });
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();stage.dataset.state='fallback';tools.hidden=true;presets.hidden=true;
    status.hidden=false;status.textContent='三维显示已中断，请刷新重试。';
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='brain-pose')return;
    const pose=event.data.pose;if(!Array.isArray(pose)||pose.length!==3||!pose.every(Number.isFinite))return;
    model.rotation.set(...pose);redraw();
  });
  if(parent!==window)parent.postMessage({type:'brain-ready'},location.origin);
  redraw();
}
