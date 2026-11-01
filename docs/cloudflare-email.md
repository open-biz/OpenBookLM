# Cloudflare transactional email

Email is sent by the Coolify backend through Cloudflare Email Sending. It needs no Pages secret, Worker, SMTP server, or email SDK.

Runtime-only settings:

- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account identifier.
- `CLOUDFLARE_EMAIL_API_TOKEN`: scoped token with Email Sending permission.
- `AUTH_EMAIL_FROM`: `login@openbooklm.com`, on the onboarded sending domain.
- `AUTH_EMAIL_FROM_NAME`: optional display name, defaults to OpenBookLM.

Include both HTML and plain text. A send succeeds only when Cloudflare accepts the intended recipient as delivered or queued. Bounces, suppression, malformed responses, and API failures throw. The request has a 15-second timeout and no automatic retries after ambiguous failures. Provider response bodies, login tokens, and secret values are never logged. Authentication callbacks await delivery and propagate failures to the caller.

Verify the sending domain's SPF/DKIM/DMARC status before deploying. Preserve existing incoming mail MX records. All apps share the account allowance and operational quota. Email Sending is for transactional messages; keep marketing newsletters on a marketing provider.

Test with `bun test cloudflare/email.test.ts`. Live delivery and link redemption require an explicitly provided test inbox.
