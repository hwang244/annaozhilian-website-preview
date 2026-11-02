import {rebuildFibers} from './rebuild-fibers.js';
self.onmessage=event=>{try{const data=rebuildFibers(event.data.data,event.data.expected);self.postMessage({data},[...new Set(Object.values(data).map(a=>a.buffer))]);}catch(error){self.postMessage({error:error.message});}};
