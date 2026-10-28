import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const here=new URL("./",import.meta.url);
const dockerfile=await readFile(new URL("Dockerfile.ci",here),"utf8");
const ignore=await readFile(new URL("Dockerfile.ci.dockerignore",here),"utf8");
const compose=await readFile(new URL("compose.ci.yaml",here),"utf8");
test("publishing credentials are absent from Docker ARG/ENV declarations and final image copies",()=>{assert.doesNotMatch(dockerfile,/^(ARG|ENV)\s+.*(?:CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)/m);assert.match(dockerfile,/COPY --from=builder \/artifact \/artifact/);assert.match(dockerfile,/USER node/);assert.doesNotMatch(dockerfile,/^EXPOSE /m);});
test("Coolify-generated nonsecret fixture credential files are excluded from the builder context",()=>{
 const patterns=ignore.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith("#"));
 for(const expected of [".env*","**/.env*",".dev.vars*","**/.dev.vars*",".git*","**/.git*","*compose*.yml","*compose*.yaml","**/*compose*.yml","**/*compose*.yaml","**/node_modules"]){assert.ok(patterns.includes(expected),expected);}
 const files=[".env",".env.production","nested/.env","nested/.env.runtime",".dev.vars","nested/.dev.vars.prod","docker-compose.yml","nested/docker-compose.yaml"];
 // These assertions model concrete Coolify names against the exact root/nested ignore rules above.
 for(const file of files){const basename=file.split("/").at(-1);const ignored=basename.startsWith(".env")||basename.startsWith(".dev.vars")||/compose.*\.ya?ml$/.test(basename);assert.equal(ignored,true,file);}
 const fixture={".env":"CLOUDFLARE_API_TOKEN=nonsecret-placeholder","nested/docker-compose.yaml":"CLOUDFLARE_API_TOKEN: nonsecret-placeholder","package.json":"{}"};
 const context=Object.entries(fixture).filter(([file])=>!file.split("/").at(-1).startsWith(".env")&&!/compose.*\.ya?ml$/.test(file));assert.equal(JSON.stringify(context).includes("nonsecret-placeholder"),false);
});
test("source Compose has an explicit finite lifecycle and no ports or Docker socket",()=>{assert.match(compose,/restart: "no"/);assert.doesNotMatch(compose,/^\s*(?:ports|expose|privileged|volumes):/m);assert.doesNotMatch(compose,/docker\.sock/);const args=compose.split("    environment:")[0];assert.doesNotMatch(args,/CLOUDFLARE_API_TOKEN/);});

test("Docker actually excludes generated fixture credentials from the build context",{skip:process.env.RUN_DOCKER_CONTEXT_TEST!=="1"},async()=>{
 const {mkdtemp,mkdir,writeFile,rm,readdir}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");const {join}=await import("node:path");const {spawnSync}=await import("node:child_process");
 const base=await mkdtemp(join(tmpdir(),"pages-ci-context-"));const source=join(base,"source");const output=join(base,"output");
 try{
  await mkdir(join(source,".cloudflare"),{recursive:true});await mkdir(join(source,"nested"));
  await writeFile(join(source,".cloudflare/Dockerfile.ci"),"FROM scratch\nCOPY . /context\n");
  await writeFile(join(source,".cloudflare/Dockerfile.ci.dockerignore"),ignore);
  for(const name of [".env",".env.production","nested/.env.runtime",".dev.vars","nested/.dev.vars.prod","docker-compose.yml","nested/generated-compose.yaml"]){await writeFile(join(source,name),"CLOUDFLARE_API_TOKEN=nonsecret-context-placeholder");}
  await writeFile(join(source,"package.json"),"{}");
  const result=spawnSync("docker",["buildx","build","--file",join(source,".cloudflare/Dockerfile.ci"),"--output","type=local,dest="+output,source],{encoding:"utf8",timeout:60000});
  assert.equal(result.status,0,result.stderr);
  async function contents(path){let text="";for(const entry of await readdir(path,{withFileTypes:true})){const p=join(path,entry.name);text+=entry.isDirectory()?await contents(p):await readFile(p,"utf8");}return text;}
  assert.equal((await contents(join(output,"context"))).includes("nonsecret-context-placeholder"),false);
  assert.equal(await readFile(join(output,"context/package.json"),"utf8"),"{}");
 }finally{await rm(base,{recursive:true,force:true});}
});
