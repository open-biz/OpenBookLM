import {readFile,mkdir,cp,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const apps=JSON.parse(await readFile(resolve(here,"builds.json"),"utf8"));
const app=process.env.PAGES_APP;
const sourceCommit=process.env.SOURCE_COMMIT;
if(!app||!Object.hasOwn(apps,app))throw new Error("PAGES_APP must name an app in .cloudflare/builds.json");
if(!/^[a-f0-9]{40}$/i.test(sourceCommit||""))throw new Error("SOURCE_COMMIT must be the immutable 40-character source commit supplied by Coolify");
// Only documented public variables may reach static builds. No runtime publishing credential is needed here.
const env={PATH:process.env.PATH,HOME:process.env.HOME,NEXT_TELEMETRY_DISABLED:"1",CI:"true"};
const publicNames=["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_WEB_APP_URL", "NEXT_PUBLIC_BASE_URL", "NEXT_PUBLIC_POSTHOG_HOST", "NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_CDN_URL", "NEXT_PUBLIC_LINODE_BUCKET_URL", "NEXT_PUBLIC_GOOGLE_API_KEY", "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"];
for(const name of publicNames)if(process.env[name]!==undefined)env[name]=process.env[name];
for(const command of [[resolve(here,"build.mjs"),app],[resolve(here,"stage.mjs"),app]]){
 const result=spawnSync(process.execPath,command,{cwd:root,env,stdio:"inherit"});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
const output="/artifact";
await mkdir(output,{recursive:true});
await cp(resolve(here,"staged",app),resolve(output,"assets"),{recursive:true});
await writeFile(resolve(output,"release.json"),JSON.stringify({version:1,app,sourceCommit:sourceCommit.toLowerCase()},null,2)+"\n");
console.log(JSON.stringify({artifact:"ready",app,sourceCommit}));
