import {access,readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
export function deploymentBranch(target,ref="local"){
 if(target==="production")return "main";
 if(target!=="preview")throw new Error("Target must be preview or production");
 return "preview-"+ref.replace(/[^a-zA-Z0-9-]/g,"-").slice(0,48);
}
async function main(){
 const [name,target="preview",flag]=process.argv.slice(2);
 const apps=JSON.parse(await readFile(resolve(here,"builds.json"),"utf8"));
 if(!Object.hasOwn(apps,name))throw new Error("Unknown app");
 const branch=deploymentBranch(target,process.env.GITHUB_REF_NAME||"local");
 if(target==="production"&&process.env.GITHUB_ACTIONS==="true"&&process.env.GITHUB_EVENT_NAME!=="workflow_dispatch")throw new Error("Production deployment requires workflow_dispatch");
 const output=resolve(here,"staged",name);await access(resolve(output,"_worker.js"));
 const head=spawnSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"});
 const status=spawnSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"});
 if(head.status!==0||status.status!==0)throw new Error("Git release metadata is unavailable");
 const sha=head.stdout.trim();const dirty=Boolean(status.stdout.trim());
 if(target==="production"&&dirty)throw new Error("Production requires a committed source tree");
 const args=["pages","deploy",output,"--project-name",name,"--branch",branch,"--commit-hash",sha,"--commit-dirty="+dirty,"--commit-message","Pages frontend deployment"];
 if(flag==="--dry-run"){console.log(JSON.stringify({app:name,target,branch,sha,dirty,command:"wrangler",arguments:args}));return;}
 if(!process.env.CLOUDFLARE_API_TOKEN||!process.env.CLOUDFLARE_ACCOUNT_ID)throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
 const cli=resolve(here,"node_modules",".bin",process.platform==="win32"?"wrangler.cmd":"wrangler");
 const result=spawnSync(cli,args,{cwd:here,stdio:"inherit",env:{...process.env,WRANGLER_SEND_METRICS:"false",CI:"true"}});
 if(result.error)throw result.error;
 process.exit(result.status===0 ? 0 : result.status||1);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
