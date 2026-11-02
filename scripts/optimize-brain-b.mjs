import {createRequire}from'node:module';import{pathToFileURL}from'node:url';import{resolve}from'node:path';import{writeFile,readFile}from'node:fs/promises';
const require=createRequire(import.meta.url),sharp=require(process.env.ANNOBRAIN_SHARP_PATH||'sharp');
const deps=process.env.ANNOBRAIN_OPT_MODULES||new URL('../node_modules/',import.meta.url).pathname;const dependency=(name,path='dist/index.js')=>import(pathToFileURL(resolve(deps,name,path)).href);
const {NodeIO}=await dependency('@gltf-transform/core');
const {ALL_EXTENSIONS,KHRTextureTransform}=await dependency('@gltf-transform/extensions');
const {meshopt,simplify}=await dependency('@gltf-transform/functions');
const {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier}=await dependency('meshoptimizer','index.js');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
for(const tier of ['desktop','mobile']){
 const doc=await io.read(process.argv[2]||new URL('../experiments/textured-brain/annobrain-neural-complete.glb',import.meta.url).pathname);
 for(const [index,texture]of doc.getRoot().listTextures().entries()){
  let image=sharp(texture.getImage());if(tier==='mobile')image=image.resize({width:index===0?2048:1024,withoutEnlargement:true});
  texture.setImage(await image.webp({quality:tier==='mobile'?93:96,effort:6,smartSubsample:true}).toBuffer()).setMimeType('image/webp');
 }
 for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){primitive.setAttribute('NORMAL',null);const uv=primitive.getAttribute('TEXCOORD_0');const values=uv.getArray();for(let i=0;i<values.length;i++)values[i]*=.5;}
 const transform=doc.createExtension(KHRTextureTransform);for(const mat of doc.getRoot().listMaterials())if(mat.getBaseColorTexture())mat.getBaseColorTextureInfo().setExtension('KHR_texture_transform',transform.createTransform().setScale([2,2]));
 if(tier==='mobile')await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.22,error:.0003,lockBorder:true}));
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium',quantizePosition:tier==='mobile'?14:16,quantizeNormal:12,quantizeTexcoord:tier==='mobile'?14:16,quantizeColor:8}));
 const file=new URL(`../experiments/textured-brain/annobrain-neural-${tier}.glb`,import.meta.url);
 const bytes=await io.writeBinary(doc);await writeFile(file,bytes);console.log(JSON.stringify({tier,bytes:bytes.length,meshes:doc.getRoot().listMeshes().length,triangles:doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((a,p)=>a+p.getIndices().getCount()/3,0),0)}));
}
