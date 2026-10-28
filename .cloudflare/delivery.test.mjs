import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm,symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {deploymentBranch} from "./deploy.mjs";
import {verifyAssets} from "./stage.mjs";
test("preview of main never targets production branch",()=>{assert.equal(deploymentBranch("preview","main"),"preview-main");assert.equal(deploymentBranch("production","cloudflare/pages"),"main");assert.throws(()=>deploymentBranch("prod"));});
test("rejects symlinks in uploaded assets",async()=>{const dir=await mkdtemp(join(tmpdir(),"pages-assets-"));try{await writeFile(join(dir,"index.html"),"fixture");await symlink(join(dir,"index.html"),join(dir,"linked.html"));await assert.rejects(verifyAssets(dir),/symlink/);}finally{await rm(dir,{recursive:true,force:true});}});
