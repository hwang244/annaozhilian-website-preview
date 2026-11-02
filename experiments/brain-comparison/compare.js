const frames=[...document.querySelectorAll('iframe[data-option]')];
const sync=document.querySelector('#sync');
const initial=[.02,-1.02,-.04];
let lastPose=initial;
const send=(frame,data)=>frame.contentWindow?.postMessage(data,location.origin);
window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  const source=frames.find(frame=>frame.contentWindow===event.source);if(!source)return;
  const message=event.data;
  const status=document.querySelector(`[data-status="${source.dataset.option}"]`);
  if(message?.type==='brain-loading'&&!status.classList.contains('ready'))status.textContent=Number.isFinite(message.percent)?`模型下载中… ${message.percent}%`:'模型下载中…';
  if(message?.type==='brain-error'){status.textContent='模型加载未成功，可刷新重试';status.classList.remove('ready');}
  if(message?.type==='brain-ready') {
    status.textContent='已就绪 · 可拖动旋转';status.classList.add('ready');
    if(sync.checked)send(source,{type:'brain-pose',pose:lastPose});
  }
  if(message?.type==='brain-pose'&&Array.isArray(message.pose)&&message.pose.length===3&&message.pose.every(Number.isFinite)) {
    lastPose=message.pose;
    for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed','false');
    if(sync.checked)for(const other of frames)if(other!==source)send(other,{type:'brain-pose',pose:lastPose});
  }
});
const poses={initial,left:[0,-Math.PI/2,0],right:[0,Math.PI/2,0],top:[Math.PI/2,0,0],bottom:[-Math.PI/2,0,0],back:[0,Math.PI,0]};
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
  lastPose=poses[button.dataset.view];
  for(const option of document.querySelectorAll('[data-view]'))option.setAttribute('aria-pressed',String(option===button));
  for(const frame of frames)send(frame,{type:'brain-pose',pose:lastPose});
});
sync.addEventListener('change',()=>{if(sync.checked)for(const frame of frames)send(frame,{type:'brain-pose',pose:lastPose});});
const dialog=document.querySelector('#reference-dialog');
document.querySelector('#reference-open').addEventListener('click',()=>dialog.showModal());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
