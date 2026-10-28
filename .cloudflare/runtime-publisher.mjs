import {access,readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const here=dirname(fileURLToPath(import.meta.url));
export function publicationPlan(release,env={}){
 if(release?.version!==1||!/^[a-z0-9][a-z0-9-]*$/.test(release.app||"")||!/^[a-f0-9]{40}$/i.test(release.sourceCommit||""))throw new Error("Invalid immutable Pages release manifest");
 const target=env.PAGES_DEPLOY_TARGET||"preview";
 if(!["preview","production"].includes(target))throw new Error("PAGES_DEPLOY_TARGET must be preview or production");
 const sha=release.sourceCommit.toLowerCase();
 if(target==="production"&&env.PAGES_PRODUCTION_SHA?.toLowerCase()!==sha)throw new Error("Manual production approval requires PAGES_PRODUCTION_SHA matching this image's source commit");
 return {app:release.app,sourceCommit:sha,target,branch:target==="production"?"main":"coolify-"+release.app};
}
export async function publish({env=process.env,releasePath=resolve(here,"../artifact/release.json"),assetsPath=resolve(here,"../artifact/assets"),cliPath=resolve(here,"node_modules/.bin/wrangler"),fetcher=globalThis.fetch,executor=spawnSync}={}){
 const release=JSON.parse(await readFile(releasePath,"utf8"));
 const plan=publicationPlan(release,env);
 await access(resolve(assetsPath,"_worker.js"));
 if(!env.CLOUDFLARE_API_TOKEN||!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID||""))throw new Error("A scoped runtime CLOUDFLARE_API_TOKEN and valid CLOUDFLARE_ACCOUNT_ID are required");
 // Fail closed if the seeded Pages project is absent. Do not let the CLI create/delegate to Workers.
 let result;
 try{
  const response=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${plan.app}`,{headers:{Authorization:"Bearer "+env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error("Project lookup failed");
  result=await response.json();
 }catch{throw new Error("Unable to verify the existing Cloudflare Pages project");}
 if(!result.success||result.result?.name!==plan.app||result.result?.production_branch!=="main")throw new Error("The seeded Pages project or production branch does not match the release manifest");
 const args=["pages","deploy",assetsPath,"--project-name",plan.app,"--branch",plan.branch,"--commit-hash",plan.sourceCommit,"--commit-dirty=false","--commit-message","Coolify Pages CI"];
 console.log(JSON.stringify({publishing:plan.app,sourceCommit:plan.sourceCommit,target:plan.target,branch:plan.branch}));
 const status=executor(cliPath,args,{cwd:process.cwd(),stdio:"inherit",env:{...env,WRANGLER_SEND_METRICS:"false",CI:"true"}});
 if(status.error)throw new Error("Unable to start pinned Wrangler");
 if(status.status!==0)throw new Error(`Pages publication failed (${status.status ?? status.signal ?? "unknown"})`);
 console.log(JSON.stringify({published:plan.app,sourceCommit:plan.sourceCommit,target:plan.target}));
 return plan;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await publish();}catch(error){console.error(error.message);process.exitCode=1;}
}
