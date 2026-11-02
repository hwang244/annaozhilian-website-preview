// Report only local browser timings; nothing is transmitted to an analytics service.
let lastProgress=0;
export function reportProgress(stage,loaded,total) {
  const now=performance.now();if(now-lastProgress<200&&loaded<total)return;lastProgress=now;
  const percent=total>0?Math.min(99,Math.floor(loaded/total*100)):null;
  const note=stage.querySelector('.loading-note');
  if(note)note.textContent=percent===null?'正在下载三维模型…':`正在下载三维模型… ${percent}%`;
  if(parent!==window)parent.postMessage({type:'brain-loading',loaded,total,percent},location.origin);
}
export function reportFailure(){if(parent!==window)parent.postMessage({type:'brain-error'},location.origin);}
export function reportFirstFrame(stage, modelPath) {
  if(stage.dataset.firstFrameScheduled)return;
  stage.dataset.firstFrameScheduled='true';
  requestAnimationFrame(()=>{
    const resource=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith(modelPath));
    const metrics={quality:stage.dataset.quality||'compact',readyMs:Math.round(performance.now()),modelDownloadMs:resource?Math.round(resource.responseEnd-resource.startTime):null,modelTransferBytes:resource?.transferSize??null,modelEncodedBytes:resource?.encodedBodySize??null,modelDecodedBytes:resource?.decodedBodySize??null,cache:resource?.transferSize===0&&resource?.decodedBodySize>0?'cached':resource?.encodedBodySize>resource?.transferSize?'revalidated':'network'};
    stage.dataset.readyMs=String(metrics.readyMs);
    stage.dataset.metrics=JSON.stringify(metrics);
    if(parent!==window)parent.postMessage({type:'brain-first-frame',metrics},location.origin);
  });
}
