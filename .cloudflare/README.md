**Cloudflare Pages delivery**

This directory is self-contained: CI never needs the k8s migration workspace or its .env files. Wrangler is pinned to 4.154.0 by package-lock.json. Its Pages deployment uses --force to retain actual Pages behavior in this CLI release.

From repository root:

```
bun install --frozen-lockfile
npm ci --prefix .cloudflare --ignore-scripts --no-audit --no-fund
node --test .cloudflare/pages-handler.test.mjs .cloudflare/delivery.test.mjs
node .cloudflare/build.mjs <app-name>
node .cloudflare/stage.mjs <app-name>
node .cloudflare/deploy.mjs <app-name> preview --dry-run
```

builds.json lists the exact build commands and output directories. stage.mjs copies output into ignored .cloudflare/staged/, removes explicitly retained assets only when a corresponding backend path is configured, checks the Pages file-size limit, and adds the shared streaming handler/routing. Original build outputs are left intact. OpenBookLM's sample-conversation.wav remains served by its retained backend; it is not uploaded to Pages.

CI pushes to cloudflare/pages create preview deployments. Production is workflow_dispatch-only, selecting target=production and the named app. A preview of main still uses preview-main, never the production branch. Production requires a committed source tree and uploads to the project's main production branch; no DNS, custom-domain, database or email configuration is changed by this workflow.

Required GitHub configuration:

- Secret CLOUDFLARE_API_TOKEN: scoped Pages deployment credential.
- Repository variable CLOUDFLARE_ACCOUNT_ID: intended Cloudflare account ID.
- Public frontend variables listed explicitly in the workflow. AIPetPhoto requires the existing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; no Clerk secret key is a build variable. OpenBookLM's Google browser-picker API key/client ID and Polypick's WalletConnect project ID are browser configuration. Provider/database/mail secrets do not belong in build variables.

The workflow maps credentials into only the final deployment step. Dependency installation and app builds receive no Cloudflare token. Configure the pages-production GitHub Environment with required reviewers if desired; this file cannot create environment protection rules. The workflow file must exist on the default branch before GitHub exposes its manual dispatch UI; initial integration does not automatically deploy production.

Runtime BACKEND_ENABLED/BACKEND_ORIGIN/ORIGIN_ACCESS_KEY and marketing LOOPS_ENDPOINT are managed on each Pages project, outside GitHub build variables. Keep preview backend access disabled; the handler additionally rejects APIs on *.pages.dev. A production upload alone does not switch a custom domain or retire Coolify APIs. Verify required backend wrappers, login/callback behavior and the exact domain cutover independently.

The edge handler is a copy of the reviewed shared implementation. Refresh its tests and app JSON config together when API allow/deny policy changes. CI runs fixture/local checks only; it does not send email, call AI providers, copy databases or execute production business mutations. Browser fixtures have separate per-app commands and were exercised during migration; they are not silently treated as production-authentication tests.
