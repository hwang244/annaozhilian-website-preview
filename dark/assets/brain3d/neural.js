import {decodeNeuralData} from './decode-compact.js';
import {reportFirstFrame,reportProgress,reportFailure} from './metrics.js?v=approvedA1';
import * as THREE from 'three';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';

const stage = document.querySelector('.neural-stage');
const loading = document.querySelector('.loading-note');
const tools = document.querySelector('.viewer-tools');
const startAngle = -1.02;
const modelFile='brain-compact-v2.bin.gz';
const english=new URLSearchParams(location.search).get('lang')==='en';
if(english)document.documentElement.lang='en';
let referenceMode = false;
let repaint = () => {};

function setMode(mode) {
  referenceMode = mode === 'reference';
  stage.classList.toggle('show-reference', referenceMode);
  tools.hidden = referenceMode || stage.dataset.state !== 'ready';
  for (const option of document.querySelectorAll('[data-mode]')) {
    option.setAttribute('aria-pressed',String(option.dataset.mode === mode));
  }
  document.querySelector('.model-credit').hidden = referenceMode;
  repaint();
}
for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => setMode(button.dataset.mode));
}

init().catch(error => {
  reportFailure();
  loading.textContent = english?'Showing the reference image.':'三维效果暂不可用，当前显示原始参考图。';
  stage.dataset.state = 'fallback';
  setMode('reference');
  console.error('Neural brain experiment:', error);
});

async function init() {
  const [metadata, binary] = await Promise.all([
    fetch('./brain-compact-v2.json').then(r => { if (!r.ok) throw Error('Model metadata'); return r.json(); }),
    fetch('./'+modelFile).then(r => {
      if (!r.ok) throw Error('Model geometry');
      let loaded=0;const total=Number(r.headers.get('content-length'))||1581335;
      const progress=new TransformStream({transform(chunk,controller){loaded+=chunk.byteLength;reportProgress(stage,loaded,total);controller.enqueue(chunk);}});
      return new Response(r.body.pipeThrough(progress).pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    })
  ]);
  let data=decodeNeuralData(binary,metadata);
  const started=performance.now();
  data=await new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./fiber-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=event=>{worker.terminate();event.data.error?reject(Error(event.data.error)):resolve(event.data.data);};
    worker.onerror=event=>{worker.terminate();reject(Error(event.message||'Fiber reconstruction'));};
    worker.postMessage({data,expected:metadata.recipeVertices},[...new Set(Object.values(data).map(a=>a.buffer))]);
  });
  stage.dataset.rebuildMs=String(Math.round(performance.now()-started));
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(ratio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.set(0, 0.12, 6.0);
  camera.lookAt(0, 0, 0);
  const brain = new THREE.Group();
  brain.rotation.set(0.02, startAngle, -0.04);
  scene.add(brain);
  const notifyPose=()=>{if(parent!==window)parent.postMessage({type:'brain-pose',pose:[brain.rotation.x,brain.rotation.y,brain.rotation.z]},location.origin);};

  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  surface.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  surface.setIndex(new THREE.BufferAttribute(data.indices,1));
  const vertex = `
    varying vec3 vNormal; varying vec3 vView; varying float vHeight; varying vec3 vPosition;
    void main() {
      vec4 view = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal); vView = -view.xyz; vHeight=position.y; vPosition=position;
      gl_Position = projectionMatrix * view;
    }`;
  brain.add(new THREE.Mesh(surface,new THREE.ShaderMaterial({
    depthWrite: true,
    vertexShader: vertex,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vView; varying vec3 vPosition;
      float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
      float noise(vec3 p) {
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main() {
        vec3 n = normalize(vNormal);
        float rim = pow(1.0 - abs(dot(n, normalize(vView))), 2.6);
        float top = max(0.0, dot(n, normalize(vec3(-0.5, 0.8, 0.5))));
        vec3 color = vec3(0.001,0.006,0.029) + vec3(0.001,0.008,0.034)*top;
        color += vec3(0.003,0.055,0.24)*rim;
        vec3 p=vPosition;
        float shell=length(vec3(p.x/1.03,(p.y-0.28)/0.93,(p.z-0.10)/1.35));
        float field=shell+0.022*noise(p*7.0)+0.008*noise(p*18.0);
        float phase=field*240.0;
        float hair=1.0-smoothstep(0.025,0.025+max(fwidth(phase)*0.8,0.03),abs(fract(phase)-0.5));
        float modulation=0.2+0.8*noise(p*24.0);
        vec3 fiberColor=mix(vec3(0.004,0.045,0.48),vec3(0.005,0.3,0.85),rim);
        float stemFade=mix(0.08,1.0,smoothstep(-1.35,-0.6,p.y));
        color+=fiberColor*hair*modulation*stemFade;
        gl_FragColor = vec4(color,1.0);
      }`
  })));

  const fibers = new THREE.BufferGeometry();
  fibers.setAttribute('position',new THREE.BufferAttribute(data.fiberPositions,3));
  fibers.setAttribute('normal',new THREE.BufferAttribute(data.fiberNormals,3));
  fibers.setAttribute('brightness',new THREE.BufferAttribute(data.fiberBrightness,1));
  brain.add(new THREE.LineSegments(fibers,new THREE.ShaderMaterial({
    vertexShader: `attribute float brightness; varying float vBrightness; ${vertex.replace('void main() {','void main() { vBrightness=brightness;')}`,
    fragmentShader: `
      varying vec3 vNormal; varying vec3 vView; varying float vBrightness; varying float vHeight;
      void main() {
        float facing = dot(normalize(vNormal), normalize(vView));
        float rim = 1.0 - abs(facing);
        vec3 color = mix(vec3(0.012,0.10,0.9), vec3(0.025,0.65,1.4), pow(rim,1.4));
        float depthFade = mix(0.09, 1.0, smoothstep(-0.1,0.25,facing));
        float stemFade=mix(0.12,1.0,smoothstep(-1.35,-0.6,vHeight));
        gl_FragColor = vec4(color * (vBrightness * 2.0 + 0.035)*depthFade*stemFade,0.72);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  })));

  const nodes = new THREE.BufferGeometry();
  nodes.setAttribute('position',new THREE.BufferAttribute(data.nodePositions,3));
  nodes.setAttribute('size',new THREE.BufferAttribute(data.nodeSizes,1));
  nodes.setAttribute('brightness',new THREE.BufferAttribute(data.nodeBrightness,1));
  nodes.setAttribute('color',new THREE.BufferAttribute(data.nodeColors,3));
  nodes.setAttribute('normal',new THREE.BufferAttribute(data.nodeNormals,3));
  brain.add(new THREE.Points(nodes,new THREE.ShaderMaterial({
    uniforms: { pixelRatio: { value: ratio } },
    vertexShader: `
      attribute float size; attribute float brightness; attribute vec3 color;
      uniform float pixelRatio;
      varying vec3 vColor; varying float vBrightness; varying float vSize; varying float vFacing;
      void main() {
        vec4 view=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*view;
        gl_PointSize=size*pixelRatio*(5.0/-view.z);
        vColor=color; vBrightness=brightness; vSize=size;
        vFacing=dot(normalize(normalMatrix*normal),normalize(-view.xyz));
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vBrightness; varying float vSize; varying float vFacing;
      void main() {
        vec2 p=gl_PointCoord-0.5; float r=length(p);
        if(r>0.5) discard;
        float core=exp(-dot(p,p)*85.0);
        float halo=exp(-dot(p,p)*14.0)*0.2;
        float cross=(exp(-abs(p.x)*65.0)*exp(-abs(p.y)*6.0)+exp(-abs(p.y)*65.0)*exp(-abs(p.x)*6.0))*step(5.0,vSize)*0.26;
        float depthFade=mix(0.07,1.0,smoothstep(-0.1,0.2,vFacing));
        gl_FragColor=vec4(vColor*vBrightness*(core*2.0+halo+cross)*depthFade,1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  })));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(600,600),0.6,0.5,0.7));
  composer.addPass(new OutputPass());
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('role','slider');
  canvas.setAttribute('aria-label',english?'Rotate the 3D brain with the left and right arrow keys':'旋转发光神经大脑，使用左右方向键');
  canvas.setAttribute('aria-valuemin','0');canvas.setAttribute('aria-valuemax','359');
  stage.prepend(canvas);
  stage.dataset.state='ready';
  stage.dataset.fiberSegments=String(data.fiberBrightness.length/2);
  stage.dataset.surfaceTriangles=String(data.indices.length/3);
  loading.hidden=true; tools.hidden=referenceMode;
  let pending=false;
  function render() {
    const angle=Math.round(((brain.rotation.y-startAngle)*180/Math.PI%360+360)%360)%360;
    stage.dataset.angle=String(angle);canvas.setAttribute('aria-valuenow',String(angle));
    stage.dataset.pitch=String(Math.round(brain.rotation.x*180/Math.PI));
    stage.dataset.yaw=String(Math.round(brain.rotation.y*180/Math.PI));
    composer.render();pending=false;reportFirstFrame(stage,'/'+modelFile);
  }
  function requestRender() { if(!pending) {pending=true;requestAnimationFrame(render);} }
  repaint=requestRender;
  new ResizeObserver(() => {
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    renderer.setSize(width,height,false); composer.setSize(width,height);
    camera.aspect=width/height;
    camera.position.z=Math.max(4.8,4.5/camera.aspect);
    camera.lookAt(0,0,0);camera.updateProjectionMatrix();requestRender();
  }).observe(stage);
  let drag=null;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0 || !event.isPrimary)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:null,touch:event.pointerType==='touch'};
    canvas.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag || drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(drag.horizontal===null){if(Math.max(Math.abs(dx),Math.abs(dy))<3)return;drag.horizontal=Math.abs(dx)>=Math.abs(dy);}
    if(drag.touch&&!drag.horizontal)return;
    brain.rotation.y+=dx*2*Math.PI/Math.max(stage.clientWidth,360);
    if(!drag.touch)brain.rotation.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,brain.rotation.x+dy*Math.PI/Math.max(stage.clientHeight,320)));
    drag.x=event.clientX;drag.y=event.clientY;requestRender();
    notifyPose();
  });
  const end=()=>{drag=null;stage.classList.remove('is-dragging');};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
  canvas.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
    event.preventDefault();
    brain.rotation.y=event.key==='Home'?startAngle:brain.rotation.y+(event.key==='ArrowRight'?1:-1)*Math.PI/12;
    requestRender();
    notifyPose();
  });
  document.querySelector('.reset-view').addEventListener('click',()=>{brain.rotation.set(.02,startAngle,-.04);requestRender();notifyPose();});
  canvas.addEventListener('webglcontextlost',event=>{
    reportFailure();
    event.preventDefault();stage.dataset.state='fallback';setMode('reference');
    loading.hidden=false;loading.textContent='三维显示已中断，当前显示原图。刷新可重新加载。';
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='brain-pose')return;
    const pose=event.data.pose;if(!Array.isArray(pose)||pose.length!==3||!pose.every(Number.isFinite))return;
    brain.rotation.set(...pose);requestRender();
  });
  if(parent!==window)parent.postMessage({type:'brain-ready'},location.origin);
  requestRender();
}
