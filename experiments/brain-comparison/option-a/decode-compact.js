export function decodeNeuralData(buffer,metadata){
 const bytes=new Uint8Array(buffer),data={};
 function planes(field,count){const values=new Uint16Array(count);let previous=0;for(let i=0;i<count;i++){previous=(previous+bytes[field.offset+i]+(bytes[field.offset+count+i]<<8))&65535;values[i]=previous;}return values;}
 for(const [name,f]of Object.entries(metadata.fields)){
  if(f.encoding==='index-delta'){const values=new Uint32Array(f.length);let cursor=f.offset,previous=0;for(let i=0;i<f.length;i++){let code=0,shift=0,b;do{b=bytes[cursor++];code|=(b&127)<<shift;shift+=7;}while(b&128);previous+=(code>>>1)^-(code&1);values[i]=previous;}data[name]=values;continue;}
  const out=new Float32Array(f.length);
  if(f.encoding==='float32'){const view=new DataView(buffer,f.offset,f.byteLength);for(let i=0;i<f.length;i++)out[i]=view.getFloat32(i*4,true);data[name]=out;continue;}
  if(f.encoding==='oct12'){
   const count=f.length/3,values=planes(f,count*2);
   for(let i=0;i<count;i++){let x=values[i]/4095*2-1,y=values[count+i]/4095*2-1,z=1-Math.abs(x)-Math.abs(y);if(z<0){const old=x;x=(1-Math.abs(y))*(old>=0?1:-1);y=(1-Math.abs(old))*(y>=0?1:-1);}const length=Math.hypot(x,y,z)||1;out[i*3]=x/length;out[i*3+1]=y/length;out[i*3+2]=z/length;}
  }else{
   const values=planes(f,f.length);
   if(f.encoding==='palette')for(let i=0;i<f.length;i++)out[i]=f.palette[values[i]];
   else{const count=f.length/f.components;for(let c=0;c<f.components;c++)for(let i=0;i<count;i++)out[i*f.components+c]=f.min[c]+values[c*count+i]/65535*(f.max[c]-f.min[c]);}
  }
  data[name]=out;
 }
 return data;
}
