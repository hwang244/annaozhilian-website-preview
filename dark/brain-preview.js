const params=new URLSearchParams(location.search);
const english=document.documentElement.lang.startsWith('en');
const reviewHost=/\.github\.io$/.test(location.hostname)||['127.0.0.1','localhost'].includes(location.hostname);
const option=params.get('brain')==='static'?'static':reviewHost&&params.get('brain')==='b'?'b':'a';
const siteBase=new URL('./',import.meta.url);
const metrics={option,fcpMs:null,lcpMs:null,modelReadyMs:null,modelDownloadMs:null,modelTransferBytes:null};
const publish=()=>{document.documentElement.dataset.previewMetrics=JSON.stringify(metrics);};
publish();
if('PerformanceObserver' in window){
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.name==='first-contentful-paint'){metrics.fcpMs=Math.round(entry.startTime);publish();}}).observe({type:'paint',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){metrics.lcpMs=Math.round(entry.startTime);publish();}}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
}
const art=document.querySelector('.hero-art');
if(option!=='static'&&art){
  document.documentElement.dataset.brainPreview=option;
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('brain-preview.css?v=approvedA1',siteBase);document.head.append(style);
  const frame=document.createElement('iframe');frame.className='brain-preview-frame';frame.title=english?'Interactive 3D brain, drag to rotate':'三维神经大脑，可拖动旋转';frame.loading='eager';
  const tools=document.createElement('div');tools.className='brain-hero-tools';
  const row=document.createElement('div');row.className='brain-hero-actions';
  const status=document.createElement('span');status.setAttribute('role','status');status.textContent=english?'Loading brain…':'正在加载大脑…';
  const reset=document.createElement('button');reset.type='button';reset.textContent=english?'Reset view':'重置视角';reset.hidden=true;
  reset.addEventListener('click',()=>frame.contentWindow?.postMessage({type:'brain-pose',pose:[.02,-1.02,-.04]},location.origin));
  row.append(status,reset);
  const credit=document.createElement('a');credit.className='brain-hero-credit';credit.textContent='BodyParts3D · CC BY 4.0';credit.target='_blank';credit.rel='noopener';credit.href=option==='a'?new URL('assets/brain3d/NOTICE.md',siteBase):new URL('../experiments/textured-brain/MODEL-ATTRIBUTION.md',siteBase);
  tools.append(row,credit);art.closest('.hero').append(tools);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='brain-loading'&&art.dataset.modelState!=='ready')status.textContent=Number.isFinite(event.data.percent)?`${english?'Loading brain':'正在加载大脑'}… ${event.data.percent}%`:(english?'Loading brain…':'正在加载大脑…');
    if(event.data?.type==='brain-error'){art.dataset.modelState='fallback';status.textContent=english?'Showing the reference image':'当前显示大脑参考图';reset.hidden=true;}
    if(event.data?.type!=='brain-first-frame')return;
    metrics.modelReadyMs=Math.round(performance.now());Object.assign(metrics,{modelFrameMs:event.data.metrics.readyMs,modelDownloadMs:event.data.metrics.modelDownloadMs,modelTransferBytes:event.data.metrics.modelTransferBytes,modelEncodedBytes:event.data.metrics.modelEncodedBytes,cache:event.data.metrics.cache});publish();
    art.dataset.modelState='ready';status.textContent=english?'Drag to rotate':'左右拖动，旋转大脑';reset.hidden=false;
    if(params.has('metrics')){const detail=document.createElement('output');detail.className='brain-preview-metrics';detail.textContent=`FCP ${metrics.fcpMs??'—'} ms · 3D ${metrics.modelReadyMs} ms · ${metrics.cache}`;tools.append(detail);}
  });
  // Let the homepage content paint before requesting the interactive model.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const url=option==='a'?new URL('assets/brain3d/?v=approvedA1',siteBase):new URL('../experiments/textured-brain/?embed=1&home=1&v=compact3',siteBase);
    if(english)url.searchParams.set('lang','en');
    if(option==='b'&&params.has('quality'))url.searchParams.set('quality',params.get('quality'));
    frame.src=url;art.append(frame);
  }));
}
