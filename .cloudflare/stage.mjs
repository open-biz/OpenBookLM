import {access,cp,mkdir,readFile,readdir,lstat,rm} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {dirname,resolve,relative,isAbsolute,sep} from "node:path";
import {fileURLToPath} from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const LIMIT=25*1024*1024;
function contained(parent,child){const value=relative(parent,child);return value!==""&&!value.startsWith(".."+sep)&&value!==".."&&!isAbsolute(value);}
export async function verifyAssets(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=resolve(directory,entry.name);const info=await lstat(path);
  if(info.isSymbolicLink())throw new Error(`Deployment contains a symlink: ${entry.name}`);
  if(info.isDirectory())await verifyAssets(path);
  else if(info.size>LIMIT)throw new Error(`Pages asset exceeds 25 MiB: ${entry.name}`);
 }
}
export async function stageApp(name){
 const builds=JSON.parse(await readFile(resolve(here,"builds.json"),"utf8"));
 if(!Object.hasOwn(builds,name))throw new Error("Unknown app");
 const config=JSON.parse(await readFile(resolve(here,name+".json"),"utf8"));
 if(config.name!==name)throw new Error("Project name does not match app config");
 const source=resolve(root,builds[name].output);
 const target=resolve(here,"staged",name);
 if(!contained(root,source)||!contained(resolve(here,"staged"),target))throw new Error("Invalid deployment path");
 await access(resolve(source,"index.html"));
 await rm(target,{recursive:true,force:true});await mkdir(dirname(target),{recursive:true});
 await cp(source,target,{recursive:true,dereference:false});
 for(const asset of config.retainedAssets||[]){
  const path=resolve(target,asset);
  if(!contained(target,path))throw new Error("Invalid retained asset path");
  const url="/"+asset.replace(/^\/+/,"");
  if(!(config.backendPaths||[]).includes(url))throw new Error(`Retained asset has no backend route: ${asset}`);
  await rm(path,{force:true});
 }
 await verifyAssets(target);
 const prepared=spawnSync(process.execPath,[resolve(here,"prepare-pages.mjs"),resolve(here,name+".json"),target],{cwd:root,stdio:"inherit"});
 if(prepared.error)throw prepared.error;
 if(prepared.status!==0)throw new Error("Pages preparation failed");
 await verifyAssets(target);
 console.log(JSON.stringify({app:name,staged:relative(root,target),retainedAssets:config.retainedAssets||[]}));
 return target;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await stageApp(process.argv[2]);
