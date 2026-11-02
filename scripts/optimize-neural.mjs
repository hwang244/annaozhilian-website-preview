import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
const dir=new URL('../experiments/brain-comparison/option-a/',import.meta.url);
const original=gunzipSync(await readFile(new URL('brain.bin.gz',dir)));
const metadata=JSON.parse(await readFile(new URL('brain.json',dir),'utf8'));
const arrays={};for(const[name,f]of Object.entries(metadata.fields)){const T=f.type==='uint32'?Uint32Array:Float32Array;arrays[name]=new T(original.buffer,original.byteOffset+f.offset,f.length);}
const {buildCurveRecipes}=await import('./neural-curve-recipes.mjs');const curves=buildCurveRecipes(arrays.positions,arrays.normals,arrays.indices);
const output={version:2,recipeVertices:metadata.fields.fiberBrightness.length,source:metadata.source,fields:{}},chunks=[];let offset=0;
function planes(values){const out=Buffer.alloc(values.length*2);let previous=0;for(let i=0;i<values.length;i++){const d=(values[i]-previous)&65535;previous=values[i];out[i]=d&255;out[i+values.length]=d>>>8;}return out;}
for(const [name,field]of Object.entries({...metadata.fields,...Object.fromEntries(Object.entries(curves).map(([n,a])=>[n,{type:a instanceof Uint32Array?'uint32':'float32',length:a.length}]))})){
 if(name.startsWith('fiber'))continue;
 const Type=field.type==='uint32'?Uint32Array:Float32Array;
 const src=curves[name]||new Type(original.buffer,original.byteOffset+field.offset,field.length);let payload,info;
 if(name==='indices'||name==='curveIds'||name==='curveLengths'){
  const bytes=[];let previous=0;for(const value of src){const delta=value-previous;previous=value;let code=((delta<<1)^(delta>>31))>>>0;while(code>127){bytes.push((code&127)|128);code>>>=7;}bytes.push(code);}payload=Buffer.from(bytes);info={encoding:'index-delta'};
 }else if(name==='curveBrightness'){payload=Buffer.from(src.buffer,src.byteOffset,src.byteLength);info={encoding:'float32'};
 }else if(name.endsWith('Normals')||name==='normals'){
  const values=new Uint16Array(src.length/3*2);
  for(let i=0;i<src.length;i+=3){let x=src[i],y=src[i+1],z=src[i+2],sum=Math.abs(x)+Math.abs(y)+Math.abs(z);x/=sum||1;y/=sum||1;z/=sum||1;if(z<0){const old=x;x=(1-Math.abs(y))*(old>=0?1:-1);y=(1-Math.abs(old))*(y>=0?1:-1);}const id=i/3;values[id]=Math.round((x*.5+.5)*4095);values[id+src.length/3]=Math.round((y*.5+.5)*4095);}
  payload=planes(values);info={encoding:'oct12'};
 }else if(name==='fiberBrightness'||name==='nodeColors'){
  const palette=[],map=new Map(),values=new Uint16Array(src.length);for(let i=0;i<src.length;i++){const v=src[i];if(!map.has(v)){map.set(v,palette.length);palette.push(v);}values[i]=map.get(v);}payload=planes(values);info={encoding:'palette',palette};
 }else{
  const components=/Positions$/.test(name)||name==='positions'?3:1,count=src.length/components,min=Array(components).fill(Infinity),max=Array(components).fill(-Infinity);
  for(let i=0;i<src.length;i++){const c=i%components;min[c]=Math.min(min[c],src[i]);max[c]=Math.max(max[c],src[i]);}
  const values=new Uint16Array(src.length);for(let c=0;c<components;c++)for(let i=0;i<count;i++)values[c*count+i]=Math.round((src[i*components+c]-min[c])/(max[c]-min[c]||1)*65535);
  payload=planes(values);info={encoding:'quant16',components,min,max};
 }
 output.fields[name]={...info,offset,byteLength:payload.length,length:src.length};chunks.push(payload);offset+=payload.length;
}
const compressed=gzipSync(Buffer.concat(chunks),{level:9});await writeFile(new URL('brain-compact-v2.bin.gz',dir),compressed);await writeFile(new URL('brain-compact-v2.json',dir),JSON.stringify(output));console.log(JSON.stringify({original:20070126,compressed:compressed.length,raw:offset,ratio:compressed.length/20070126}));
