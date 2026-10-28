**Coolify primary CI for Cloudflare Pages**

This is a finite build-and-publish job. It has no HTTP server, domain, public port, privileged mode or Docker socket. The existing Coolify application/API containers remain separate.

**Resource contract**

Create a Git-source **Docker Compose Application** for each frontend (five resources total; two use the Nomad monorepo):

| Setting | Value |
| --- | --- |
| Repository branch | `cloudflare/pages` initially; select the reviewed release branch explicitly |
| Base directory | `/` |
| Build pack | `dockercompose` |
| Docker Compose location | `/.cloudflare/compose.ci.yaml` |
| Compose service | `ci` |
| Include source commit in build | `include_source_commit_in_build=true` |
| Custom Compose start command | `docker compose up --abort-on-container-exit --exit-code-from ci` |
| Health checks | Disabled |
| Public domains/ports | None |
| Restart policy | Explicit `restart: "no"` in committed Compose |
| Automatic deployment | Disabled during migration; preview automation can be enabled separately |

Coolify4.5's ordinary Dockerfile Application generator hardcodes `restart: unless-stopped`; its custom Docker run options do not support `--restart=no`. Do not use that application mode for this job. The source Compose file's explicit restart policy is required. The custom foreground start command lets the publisher exit status determine the deployment result; default detached `up -d` would finish before publication completes. An exited container after success is expected and should not be kept alive by a dummy daemon.

Compose's build context is `..` relative to the `.cloudflare/` source file, with Dockerfile `.cloudflare/Dockerfile.ci`. Keep this relative path when Coolify supplies the Compose file/project directory.

**Build inputs (public only)**

`PAGES_APP` selects one of the app keys in `.cloudflare/builds.json`. The relevant names are `nomad-marketing`, `nomad-web`, `aipetphoto-web`, `openbooklm-web` and `polypick6-web`; each repository includes only its own supported names. `SOURCE_COMMIT` must be the full immutable 40-character commit supplied by Coolify, not `HEAD`, a branch name or a manually stale revision. Missing/invalid metadata fails before publication. Confirm this environment is provided to source Compose builds as well as Dockerfile builds; the first manual pilot must inspect the resulting OCI revision label/artifact.

The only other Docker build arguments are explicit browser configuration:

- Marketing: application URLs (the build manifest supplies current canonical defaults).
- Nomad: public PostHog host/key.
- AIPetPhoto: the **existing Clerk publishable key**, public CDN/bucket URLs and public PostHog values. Never supply Clerk secret keys or change its auth provider.
- OpenBookLM: public Google browser-picker API key/client ID.
- Polypick6: public WalletConnect project ID.

All declared arguments are listed in `Dockerfile.ci` and `compose.ci.yaml`. The build script additionally filters the subprocess environment to those exact public names. Normal frontend contract checks and builds are reused. No database connection, mail send, AI inference or training is part of this CI job.

The dedicated `Dockerfile.ci.dockerignore` excludes root/nested `.env*`, `.dev.vars*`, `.git*`, generated/source Compose YAML, dependency directories and build outputs. This is essential because Coolify writes runtime environment/Compose configuration inside its checkout. Those files must not enter `COPY . .` or builder layers. Runtime secrets are not Docker ARGs or ENV declarations. The final image copies only pinned upload tooling, the runtime publisher and the staged static artifact; application source/dependencies remain in the builder stage.

**Runtime environment**

| Name | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped Pages deployment token; runtime-only secret (`is_buildtime=false`, `is_runtime=true`) |
| `CLOUDFLARE_ACCOUNT_ID` | Intended account identifier; runtime-only |
| `PAGES_DEPLOY_TARGET` | `preview` by default; `production` only for an explicitly initiated promotion |
| `PAGES_PRODUCTION_SHA` | Required for production; must equal the immutable revision in the built image |

The publisher ignores runtime `PAGES_APP`/`SOURCE_COMMIT` overrides: the image's `/artifact/release.json` owns its project and revision. Preview uploads use `coolify-<app>`; production uses the project's `main` production branch. A subsequent commit cannot inherit approval from an older SHA. Keep production CI resources automatic-deployment-disabled unless the promotion policy is deliberately changed.

The scoped token is needed only after the static build completes. The runtime validates the existing Pages project and branch, invokes its pinned Wrangler once, propagates failure and exits. It does not retry an ambiguous upload automatically. After an interrupted upload, inspect Cloudflare deployment metadata before manually repeating it.

Cloudflare backend origin/key, `BACKEND_ENABLED`, and marketing `LOOPS_ENDPOINT` remain runtime settings on the Pages projects, not CI browser build variables. This publisher does not modify them or touch DNS/custom domains.

**Verification**

Run the Node tests listed in README. Runtime tests use nonsecret credentials and fake fetch/CLI executors: they prove no `.git` requirement, immutable app/revision selection, exact-SHA production approval, credential-free CLI arguments, seeded-project verification and nonzero failure propagation. Context contract tests assert the dedicated exclusion rules and finite Compose policy.

For an actual Docker context-export test with nonsecret placeholder credentials and no network/image base, run:

```
RUN_DOCKER_CONTEXT_TEST=1 node --test .cloudflare/ci-context.test.mjs
```

For the first image pilot, the operator should build with a real reviewed `SOURCE_COMMIT` and public app variables, inspect the revision label/release artifact, then run as a preview with a runtime-only scoped token. Container image configuration/history must have no publishing token; logs should contain only the app, revision, target and normal upload progress. Start with one manual preview job before considering Git-webhook automation. Actual Docker builds and live uploads must be reported separately from unit/fixture checks.

Implementation validation: the Nomad marketing CI image was built locally with the actual multistage Dockerfile. Its nonroot final image has no exposed ports or health probe, contains the immutable app/SHA artifact without source or .git, and runs pinned Wrangler4.154.0. Starting it without credentials exits1 immediately. The real Docker fixture context-export check also passed with placeholder environment/Compose secrets excluded. No scoped token was supplied to that image test, and no Cloudflare upload was attempted. Other apps share the same publisher contract; their first image-build/upload pilots remain per-app validation.
