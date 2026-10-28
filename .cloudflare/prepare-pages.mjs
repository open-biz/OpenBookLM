import {readFile, writeFile, mkdir, access, unlink} from "node:fs/promises";
import {resolve, dirname, sep} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [configFile, outputDirectory] = process.argv.slice(2);
if (!configFile || !outputDirectory) throw new Error("Usage: node prepare-pages.mjs <app-config.json> <build-output>");
const config = JSON.parse(await readFile(resolve(configFile), "utf8"));
const output = resolve(outputDirectory);
await access(resolve(output, "index.html"));
await mkdir(output, {recursive: true});
for (const relative of config.retainedAssets || []) {
  const target = resolve(output, relative);
  if (!target.startsWith(output + sep)) throw new Error("Retained asset must be inside the build output");
  try { await unlink(target); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const handler = await readFile(resolve(here, "pages-handler.mjs"), "utf8");
await writeFile(resolve(output, "_worker.js"), handler + "\nexport default createPagesHandler(" + JSON.stringify(config) + ");\n");
await writeFile(resolve(output, "_routes.json"), JSON.stringify({version: 1, include: ["/*"], exclude: ["/assets/*", "/_next/static/*", "/fonts/*", "/favicon.ico", "/robots.txt", "/sitemap.xml"]}, null, 2) + "\n");
if (config.spa) {
  try {
    const redirects = await readFile(resolve(output, "_redirects"), "utf8");
    await writeFile(resolve(output, "_redirects"), redirects.split("\n").filter(line => !/^\s*\/\*\s+\/index\.html\s+200\s*$/.test(line)).join("\n"));
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}
// Disable Pages' implicit unknown-path SPA fallback; the handler distinguishes navigation from missing assets and APIs.
try { await access(resolve(output, "404.html")); }
catch { await writeFile(resolve(output, "404.html"), '<!doctype html><meta name="robots" content="noindex"><title>Not found</title><h1>Not found</h1>'); }
console.log(JSON.stringify({app: config.name, output, handler: true}));
