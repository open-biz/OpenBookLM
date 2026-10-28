**Cloudflare Pages delivery through Coolify**

Coolify is the primary CI runner. Each frontend uses a source-based Docker Compose Application whose finite `ci` service builds static assets and then publishes them to the existing Pages project. See [COOLIFY-CI.md](COOLIFY-CI.md) for exact resource settings and credential boundaries.

There is no GitHub Actions dependency. The old GitHub workflow was removed; repository source and normal Git webhooks are sufficient. Existing unrelated repository workflows are outside this delivery path.

Build commands/output directories remain in builds.json. Pinned Wrangler4.154.0 and package-lock.json are self-contained in this directory. Runtime publishing uses the existing project and fails closed if it is missing, rather than letting a CLI create/delegate to a Worker.

Local validation from repository root:

```
bun install --frozen-lockfile
npm ci --prefix .cloudflare --ignore-scripts --no-audit --no-fund
node --test .cloudflare/pages-handler.test.mjs .cloudflare/delivery.test.mjs .cloudflare/runtime-publisher.test.mjs .cloudflare/ci-context.test.mjs
node .cloudflare/build.mjs <app-name>
node .cloudflare/stage.mjs <app-name>
```

The local deployment helper remains available for a clean reviewed checkout with existing private runtime Cloudflare environment credentials:

```
node .cloudflare/deploy.mjs <app-name> preview --dry-run
```

Coolify's image publisher instead reads app/SHA from an immutable built artifact and does not need `.git`. It uploads only that app's static assets and edge handler. A Pages upload does not change DNS/custom domains or retire Coolify API services. Keep preview backend access disabled; real login, callback and backend-contract validation remain distinct from fixture checks.
