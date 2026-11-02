const params=new URLSearchParams(location.search),option=params.get('brain');
const metrics={option:['a','b'].includes(option)?option:'static',fcpMs:null,lcpMs:null,modelReadyMs:null,modelDownloadMs:null,modelTransferBytes:null};
const publish=()=>{document.documentElement.dataset.previewMetrics=JSON.stringify(metrics);};
publish();
if('PerformanceObserver' in window){
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.name==='first-contentful-paint'){metrics.fcpMs=Math.round(entry.startTime);publish();}}).observe({type:'paint',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){metrics.lcpMs=Math.round(entry.startTime);publish();}}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
}
if(['a','b'].includes(option)&&(/\.github\.io$/.test(location.hostname)||['127.0.0.1','localhost'].includes(location.hostname))){
  const art=document.querySelector('.hero-art');
  if(art){
    document.documentElement.dataset.brainPreview=option;
    const style=document.createElement('link');style.rel='stylesheet';style.href='brain-preview.css?v=1';document.head.append(style);
    document.title=`${option.toUpperCase()} / 选项 ${option==='a'?'1':'2'} · 首页方案 · 安脑智联`;
    const frame=document.createElement('iframe');frame.className='brain-preview-frame';frame.title=`${option.toUpperCase()} 首页三维大脑，可拖动旋转`;frame.loading='eager';
    const strip=document.createElement('aside');strip.className='brain-preview-strip';strip.setAttribute('aria-label','首页三维方案预览');
    strip.innerHTML=`<strong>${option.toUpperCase()} / 选项 ${option==='a'?'1':'2'}</strong><nav aria-label="切换首页方案"><a href="?brain=a" ${option==='a'?'aria-current="page"':''}>A 首页</a><a href="?brain=b" ${option==='b'?'aria-current="page"':''}>B 首页</a><a href="../experiments/brain-comparison/">并排对比 ↗</a><a href="index.html">静态原版</a></nav><span class="brain-preview-status" role="status">正在加载 3D，先显示原图…</span><a class="brain-preview-credit" href="../experiments/textured-brain/MODEL-ATTRIBUTION.md" target="_blank" rel="noopener">BodyParts3D · CC BY 4.0</a>`;
    document.body.append(strip);
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
      if(event.data?.type==='brain-loading'&&art.dataset.modelState!=='ready')strip.querySelector('.brain-preview-status').textContent=Number.isFinite(event.data.percent)?`3D 模型下载中 ${event.data.percent}% · 正文与原图可先浏览`:'正在下载 3D 模型…';
      if(event.data?.type==='brain-error')strip.querySelector('.brain-preview-status').textContent='3D 加载未成功，当前显示原图；可刷新重试';
      if(event.data?.type!=='brain-first-frame')return;
      metrics.modelReadyMs=Math.round(performance.now());Object.assign(metrics,{modelFrameMs:event.data.metrics.readyMs,modelDownloadMs:event.data.metrics.modelDownloadMs,modelTransferBytes:event.data.metrics.modelTransferBytes,modelEncodedBytes:event.data.metrics.modelEncodedBytes,cache:event.data.metrics.cache});publish();
      art.dataset.modelState='ready';strip.querySelector('.brain-preview-status').textContent='3D 已就绪 · 默认静止，拖动旋转';
      if(params.has('metrics')){
        const detail=document.createElement('output');detail.className='brain-preview-metrics';detail.textContent=`首次内容 ${metrics.fcpMs??'—'} ms · 3D 可操作 ${metrics.modelReadyMs} ms · 模型下载 ${metrics.modelDownloadMs??'—'} ms · ${metrics.cache}`;strip.append(detail);
      }
    });
    // Give text and the original image a paint opportunity before starting the model.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      frame.src=option==='a'?'../experiments/brain-comparison/option-a/?home=1':'../experiments/textured-brain/?embed=1&home=1';art.append(frame);
    }));
  }
}
