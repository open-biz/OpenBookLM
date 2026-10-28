import {readFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,"..");
const apps=JSON.parse(await readFile(resolve(here,"builds.json"),"utf8"));
const app=apps[process.argv[2]];
if(!app)throw new Error("Choose an app listed in .cloudflare/builds.json");
const env={...process.env,...app.publicEnv};
for(const command of app.checks||[]){
 const result=spawnSync(command[0],command.slice(1),{cwd:root,env,stdio:"inherit"});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
const result=spawnSync(app.build[0],app.build.slice(1),{cwd:root,env,stdio:"inherit"});
if(result.error)throw result.error;
process.exit(result.status===0 ? 0 : result.status||1);
