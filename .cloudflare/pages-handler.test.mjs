import test from "node:test";
import assert from "node:assert/strict";
import {createPagesHandler} from "./pages-handler.mjs";

const config = {name: "fixture-app", canonicalHost: "app.example.com", aliases: ["www.example.com"], spa: true, backendPaths: ["/callback"]};
const env = {BACKEND_ENABLED: "true", BACKEND_ORIGIN: "https://origin.example.com", ASSETS: {fetch: async () => new Response("missing", {status: 404})}};

test("previews cannot reach production APIs, including mutations", async () => {
  let called = false;
  const app = createPagesHandler(config, async () => {called = true; return new Response();});
  for (const method of ["GET", "POST"]) {
    const result = await app.fetch(new Request("https://preview.pages.dev/api/private", {method}), env);
    assert.equal(result.status, 503);
    assert.match(result.headers.get("content-type"), /application\/json/);
  }
  assert.equal(called, false);
});

test("rejects recursive and credential-bearing backend targets", async () => {
  let calls = 0;
  const app = createPagesHandler(config, async () => {calls++; return new Response();});
  for (const origin of ["https://app.example.com", "https://www.example.com", "https://other.pages.dev", "http://origin.example.com", "https://user:pass@origin.example.com"]) {
    const result = await app.fetch(new Request("https://app.example.com/api/data"), {...env, BACKEND_ORIGIN: origin});
    assert.equal(result.status, 503);
  }
  assert.equal(calls, 0);
});

test("raw webhook body, method, query, content type and signature survive unchanged", async () => {
  const payload = '{ "event": "paid", "id":"a\\nb" }\n';
  const app = createPagesHandler(config, async request => {
    assert.equal(request.url, "https://origin.example.com/api/hook?key=a%2Bb");
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("stripe-signature"), "fixture-signature");
    assert.equal(request.headers.get("x-forwarded-host"), "app.example.com");
    assert.equal(request.headers.get("cookie"), "session=fixture");
    assert.equal(await request.text(), payload);
    return new Response(null, {status: 204});
  });
  const result = await app.fetch(new Request("https://app.example.com/api/hook?key=a%2Bb", {method: "POST", headers: {"content-type": "application/json", "stripe-signature": "fixture-signature", cookie: "session=fixture"}, body: payload}), env);
  assert.equal(result.status, 204);
});

test("multipart bytes and boundary are never reconstructed", async () => {
  const boundary = "fixture-boundary";
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="pet.jpg"\r\nContent-Type: image/jpeg\r\n\r\nBINARY-FIXTURE\r\n--${boundary}--\r\n`;
  const app = createPagesHandler(config, async request => {
    assert.equal(request.headers.get("content-type"), "multipart/form-data; boundary=" + boundary);
    assert.equal(await request.text(), body);
    return new Response("ok");
  });
  assert.equal((await app.fetch(new Request("https://app.example.com/api/upload", {method: "POST", headers: {"content-type": "multipart/form-data; boundary=" + boundary}, body}), env)).status, 200);
});

test("preserves multiple cookies and redirects without following upstream", async () => {
  const app = createPagesHandler(config, async request => {
    assert.equal(request.redirect, "manual");
    const headers = new Headers({location: "https://origin.example.com/auth/return"});
    headers.append("set-cookie", "session=one; Path=/; Secure; HttpOnly; Domain=origin.example.com");
    headers.append("set-cookie", "state=two; Path=/; Secure; SameSite=Lax");
    return new Response(null, {status: 302, headers});
  });
  const result = await app.fetch(new Request("https://app.example.com/api/auth/start"), env);
  assert.equal(result.status, 302);
  assert.equal(result.headers.get("location"), "https://app.example.com/auth/return");
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.match(result.headers.getSetCookie()[0], /Domain=app.example.com/);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
});

test("SSE response is available before the upstream stream completes", async () => {
  let controller;
  const stream = new ReadableStream({start(c) {controller = c;}});
  const app = createPagesHandler(config, async () => new Response(stream, {headers: {"content-type": "text/event-stream"}}));
  const result = await app.fetch(new Request("https://app.example.com/api/odds/stream"), env);
  controller.enqueue(new TextEncoder().encode("data: fixture\n\n"));
  const reader = result.body.getReader();
  assert.equal(new TextDecoder().decode((await reader.read()).value), "data: fixture\n\n");
  controller.close();
  assert.equal((await reader.read()).done, true);
});

test("upstream failures stay JSON errors and never fall back to HTML or retry", async () => {
  let calls = 0;
  const app = createPagesHandler(config, async () => {calls++; throw new Error("private details");});
  const result = await app.fetch(new Request("https://app.example.com/api/save", {method: "POST"}), env);
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), {error: "Backend temporarily unavailable."});
  assert.equal(calls, 1);
});

test("client deep links use shell but missing assets do not", async () => {
  const assets = {fetch: async request => {
    const path = new URL(request.url).pathname;
    if (path === "/index.html") return Response.redirect("https://preview.pages.dev/", 308);
    return path === "/" ? new Response("shell") : new Response("missing", {status: 404});
  }};
  const app = createPagesHandler(config);
  const deep = await app.fetch(new Request("https://preview.pages.dev/chat/private-id"), {...env, ASSETS: assets});
  assert.equal(deep.status, 200);
  assert.equal(deep.headers.get("location"), null);
  assert.equal(await deep.text(), "shell");
  assert.equal((await app.fetch(new Request("https://preview.pages.dev/missing.js"), {...env, ASSETS: assets})).status, 404);
});

test("newsletter validates locally and is disabled on previews without sending", async () => {
  let calls = 0;
  const app = createPagesHandler({...config, newsletter: true}, async () => {calls++; return new Response();});
  assert.equal((await app.fetch(new Request("https://preview.pages.dev/api/newsletter", {method: "POST"}), env)).status, 503);
  assert.equal((await app.fetch(new Request("https://app.example.com/api/newsletter", {method: "POST", headers: {"content-type": "application/json"}, body: '{"email":"invalid"}'}), env)).status, 400);
  assert.equal(calls, 0);
});

test("bad newsletter configuration returns JSON503 without a network call", async () => {
  let calls = 0;
  const app = createPagesHandler({...config, newsletter: true}, async () => {calls++; return new Response();});
  for (const endpoint of ["bad-url", "https://user:password@example.com", "https://example.com/#fragment"]) {
    const request = new Request("https://app.example.com/api/newsletter", {method: "POST", headers: {"content-type": "application/json"}, body: '{"email":"fixture@example.com"}'});
    const result = await app.fetch(request, {...env, LOOPS_ENDPOINT: endpoint});
    assert.equal(result.status, 503);
  }
  assert.equal(calls, 0);
});

test("inactive cron/debug paths and unknown API paths cannot reach upstream", async () => {
  let calls = 0;
  const app = createPagesHandler({...config, apiPaths: ["/api/catalog"], deniedPaths: ["/api/cron"]}, async () => {calls++; return new Response();});
  for (const path of ["/api/cron/run", "/api/test-redis", "/api/other"]) {
    assert.equal((await app.fetch(new Request("https://app.example.com" + path), env)).status, 404);
  }
  assert.equal(calls, 0);
});
