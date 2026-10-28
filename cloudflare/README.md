Cloudflare Pages frontend
========================

This checkout starts at production release `ea43e016bf22f69cb3ca5f9b4ed3611aaa9bc530`.
The existing Next.js/Docker backend remains in place. `build` still builds that backend;
`build:pages` builds the separate browser application by reusing its UI components.

```sh
bun install --frozen-lockfile
bun run build:pages
bunx playwright install chromium
bun run test:pages
bun run typecheck
```

Output: `pages-dist/` at repository root. Root coordinator adds the `.cloudflare/`
API worker, routing and deployment configuration. Do not enable live traffic without
the retained backend release containing `GET /api/pages/bootstrap`.

The browser build only accepts the public Google API key and Google client ID through
`NEXT_PUBLIC_GOOGLE_API_KEY` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Its authentication
base is the current browser origin. Vite does not read `.env` files, and the build
fails if Prisma/Redis/server-auth modules enter the browser module graph.

The original `next/font/google` Inter variable font is self-hosted under
`public/fonts/inter/` using the exact seven WOFF2 subsets from the verified Next
backend build, with its SIL Open Font License. The original fallback metrics are
retained and the Latin subset is preloaded. Browser tests verify computed Inter,
successful same-origin WOFF2 loading and a loaded Inter FontFace. No Google Fonts
runtime request or new font subscription is used.

The new bootstrap handler performs the former root-page query for owned, shared and
bookmarked notebooks. It emits explicit card fields and role metadata, never the
owner's complete user record. Its response is private/no-store and the existing
guest helper persists its HttpOnly cookie. Anonymous bootstrap is a **side-effecting
GET**: it may create a guest user and initial credits, set a cookie and update the list
cache. Do not call it anonymously in production merely as a health probe.
Notebook operations still use the existing
backend authorization; client navigation does not grant access.

Both shared authentication helpers now reject registered-account identities supplied
through the unsigned guest cookie; legitimate guest users still work, and a valid
Better Auth session takes precedence. The new bootstrap additionally validates the
resolved identity. No database/schema/provider migration is involved. Guest cookies
still act as bearer identifiers for guests; this is not a claim to have replaced the
entire application's guest-authentication design.

Home and notebook subtrees reset on authoritative session identity changes. Pending
notebook/history/bootstrap reads abort on unmount and ignore late responses. The
browser fixture switches accounts and logs out during a deferred notebook response
to check that previous private notebook/history data cannot be restored afterwards.

The client handles `/`, `/privacy`, arbitrary `/notebook/:id` paths and unknown-page
display, including history navigation and direct reload. It normalizes cached object
and SQL-array chat history. Existing chat completion remains JSON; the client now
reads the full response rather than assuming each network chunk is complete JSON.
Backend provider/model/credits/processing implementations are retained.

The coordinator's same-origin proxy must preserve these API paths as appropriate:

- `/api/auth/*`, `/api/pages/bootstrap`.
- `/api/notebooks` and existing notebook item/source/notes/share/bookmark/audio paths.
- `/api/chat`, `/api/chat/history`, the existing `/api/chat/:notebookId` path if used.
- `/api/user`, `/api/user/guest`, `/api/credits/usage`.
- `/api/fetch-url` only if enabled for its existing client flow; `/api/health` for checks.

Do not expose `/api/test-redis` through the Pages bridge. The proxy must supply JSON
errors for rejected APIs rather than an HTML fallback. Cookies and redirects must use
the public app origin even when the fixed backend alias differs.

Fixture tests use no live API, mail, provider or AI requests. Browser tests cover lists,
deep links/reload/history, JSON chat, ownership-denied display, expired-session display,
privacy and unknown routes; they assert no uncaught page errors. Unit fixtures cover
role DTOs without owner credential fields and history/completion normalization. The
test browser can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Separate
Bun tests mock the real authentication helper's session, cookie and database adapters
to verify registered-ID forgery rejection, genuine guest reuse, session priority and
deliberate guest creation with an HttpOnly cookie. No real rows or credits are created
by those tests.

Existing limitations: website input still calls `http://170.187.161.93:8000/website`
from the browser (mixed content under HTTPS). PDF/audio/server website processing also
have preexisting Python-origin configuration dependencies. No actual processing test,
mail delivery or real OAuth-provider callback was performed. These are not proven by
the fixture browser test and are not silently redesigned as part of frontend hosting.
