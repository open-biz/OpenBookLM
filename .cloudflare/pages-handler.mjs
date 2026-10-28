const JSON_HEADERS = {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store"};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {status, headers: JSON_HEADERS});
}

function secure(response, app) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-pages-app", app);
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

async function smallJson(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  if (Number(request.headers.get("content-length") || 0) > 4096) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const parts = [];
  let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); return null; }
    parts.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(body)); } catch { return null; }
}

async function newsletter(request, env, fetcher, canonicalHost) {
  if (request.method !== "POST") return json({success: false, message: "Method not allowed"}, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== "https://" + canonicalHost) return json({success: false, message: "Invalid request origin"}, 403);
  const data = await smallJson(request);
  if (!data || typeof data.email !== "string" || data.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return json({success: false, message: "Please enter a valid email address."}, 400);
  }
  if (!env.LOOPS_ENDPOINT) return json({success: false, message: "Newsletter service is not configured."}, 503);
  let endpoint;
  try { endpoint = new URL(env.LOOPS_ENDPOINT); } catch { return json({success: false, message: "Newsletter service is not configured."}, 503); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash) return json({success: false, message: "Newsletter service is not configured."}, 503);
  try {
    const result = await fetcher(endpoint, {
      method: "POST", headers: {"content-type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({email: data.email.trim(), userGroup: "Newsletter"}), redirect: "error", signal: AbortSignal.timeout(15000),
    });
    return result.ok
      ? json({success: true, message: "Successfully subscribed!"})
      : json({success: false, message: "Failed to subscribe. Please try again."}, 502);
  } catch {
    return json({success: false, message: "Failed to subscribe. Please try again."}, 502);
  }
}

function backendUrl(value, canonicalHost, aliases) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if ([canonicalHost, ...aliases].includes(url.hostname) || url.hostname.endsWith(".pages.dev")) return null;
    return url;
  } catch { return null; }
}

function backendHeaders(upstream, origin, canonicalHost) {
  const headers = new Headers(upstream.headers);
  const location = headers.get("location");
  if (location) {
    try {
      const url = new URL(location, origin);
      if (url.origin === origin.origin) {
        url.host = canonicalHost;
        url.protocol = "https:";
        headers.set("location", url.toString());
      }
    } catch { /* Retain an opaque upstream Location instead of inventing a redirect. */ }
  }
  const cookies = upstream.headers.getSetCookie();
  headers.delete("set-cookie");
  for (const cookie of cookies) {
    headers.append("set-cookie", cookie.replace(/(;\s*Domain=)(\.?[^;\s]+)/ig, (whole, prefix, domain) =>
      domain.replace(/^\./, "").toLowerCase() === origin.hostname.toLowerCase() ? prefix + canonicalHost : whole));
  }
  // APIs include session, ownership and credit state; do not put their responses in shared caches.
  headers.set("cache-control", "private, no-store");
  headers.delete("cdn-cache-control");
  headers.delete("cloudflare-cdn-cache-control");
  return headers;
}

/** Streaming Pages boundary. Runtime API access is enabled only on the configured production hosts. */
export function createPagesHandler(config, fetcher = globalThis.fetch) {
  const aliases = config.aliases || [];
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const productionHost = [config.canonicalHost, ...aliases].includes(url.hostname);
      const api = url.pathname === "/api" || url.pathname.startsWith("/api/") || (config.backendPaths || []).some(path => url.pathname === path || url.pathname.startsWith(path + "/"));
      if (url.pathname === "/__pages/health") {
        return secure(json({app: config.name, frontend: "pages", backendEnabled: productionHost && env.BACKEND_ENABLED === "true"}), config.name);
      }
      if (productionHost && url.hostname !== config.canonicalHost) {
        url.hostname = config.canonicalHost;
        return secure(Response.redirect(url.toString(), 308), config.name);
      }
      if (api) {
        const denied = (config.deniedPaths || []).some(path => url.pathname === path || url.pathname.startsWith(path + "/"));
        const allowed = !config.apiPaths || config.apiPaths.some(path => url.pathname === path || url.pathname.startsWith(path + "/"));
        if (denied || !allowed) return secure(json({error: "Not found"}, 404), config.name);
        if (!productionHost || env.BACKEND_ENABLED !== "true") {
          return secure(json({error: "Backend access is disabled for this deployment."}, 503), config.name);
        }
        if (config.newsletter && url.pathname === "/api/newsletter") {
          return secure(await newsletter(request, env, fetcher, config.canonicalHost), config.name);
        }
        const origin = backendUrl(env.BACKEND_ORIGIN || "", config.canonicalHost, aliases);
        if (!origin) return secure(json({error: "Backend origin is not configured."}, 503), config.name);
        const target = new URL(request.url);
        target.protocol = origin.protocol;
        target.host = origin.host;
        const headers = new Headers(request.headers);
        headers.delete("host");
        headers.delete("x-pages-origin-key");
        headers.delete("forwarded");
        headers.delete("x-real-ip");
        headers.set("x-forwarded-host", config.canonicalHost);
        headers.set("x-forwarded-proto", "https");
        // Any configured origin credential is server-only and cannot be supplied by the caller.
        if (env.ORIGIN_ACCESS_KEY) headers.set("x-pages-origin-key", env.ORIGIN_ACCESS_KEY);
        const init = {method: request.method, headers, redirect: "manual", signal: request.signal};
        if (request.method !== "GET" && request.method !== "HEAD") {
          init.body = request.body;
          init.duplex = "half"; // Required by Node's Request in transport tests; ignored by workerd.
        }
        try {
          const upstream = await fetcher(new Request(target, init), {cf: {cacheTtl: 0, cacheEverything: false}});
          return secure(new Response(upstream.body, {
            status: upstream.status, statusText: upstream.statusText,
            headers: backendHeaders(upstream, origin, config.canonicalHost),
          }), config.name);
        } catch {
          return secure(json({error: "Backend temporarily unavailable."}, 502), config.name);
        }
      }
      if (request.method !== "GET" && request.method !== "HEAD") return secure(json({error: "Method not allowed"}, 405), config.name);
      let response = await env.ASSETS.fetch(request);
      const missingAsset = /\.[a-zA-Z0-9]{1,12}$/.test(url.pathname) || /^\/(?:assets|_next|fonts)\//.test(url.pathname);
      if (response.status === 404 && config.spa && !missingAsset) {
        // Pages canonicalizes /index.html to / with a redirect. Fetch / internally so a
        // private deep link receives shell bytes while retaining its original browser URL.
        const shell = new URL("/", request.url);
        response = await env.ASSETS.fetch(new Request(shell, request));
      }
      return secure(response, config.name);
    },
  };
}
