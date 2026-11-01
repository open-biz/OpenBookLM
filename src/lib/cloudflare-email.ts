type TransactionalEmail = {
  to: string
  subject: string
  text: string
  html: string
}

type EmailConfig = { token: string; from: string; accountId: string }

function emailConfiguration(env: Record<string, string | undefined>): EmailConfig | { error: string } {
  if (!env.CLOUDFLARE_EMAIL_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !env.AUTH_EMAIL_FROM) {
    return { error: "Cloudflare magic-link email requires CLOUDFLARE_EMAIL_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and AUTH_EMAIL_FROM" }
  }
  if (!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)) {
    return { error: "CLOUDFLARE_ACCOUNT_ID must be a 32-character account identifier" }
  }
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.AUTH_EMAIL_FROM)) {
    return { error: "AUTH_EMAIL_FROM must be a plain email address on a verified sending domain" }
  }
  return {
    token: env.CLOUDFLARE_EMAIL_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    from: env.AUTH_EMAIL_FROM,
  }
}

export function authEmailConfigurationError(env: Record<string, string | undefined> = process.env): string {
  const config = emailConfiguration(env)
  return "error" in config ? config.error : ""
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/**
 * Send an authentication email without exposing provider credentials to the
 * browser. Cloudflare's HTTP API works directly from Coolify and self-hosted
 * deployments without a Worker, extra runtime dependency, or SMTP server.
 */
export async function sendTransactionalEmail({ to, subject, text, html }: TransactionalEmail): Promise<void> {
  const config = emailConfiguration(process.env)
  if ("error" in config) throw new Error(config.error)
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/email/sending/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: { address: config.from, name: process.env.AUTH_EMAIL_FROM_NAME || "OpenBookLM" }, to: [to], subject, text, html }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    // Provider bodies may contain recipient details or the secret login URL.
    // Do not log them or retry an ambiguous send automatically.
    throw new Error(`Cloudflare authentication email delivery failed (HTTP ${response.status})`)
  }
  const data = await response.json().catch(() => null)
  const result = data?.result
  const includesRecipient = (value: unknown): boolean => Array.isArray(value)
    && value.some((address) => typeof address === "string" && address.toLowerCase() === to.toLowerCase())
  if (data?.success !== true
    || (Array.isArray(data.errors) && data.errors.length > 0)
    || includesRecipient(result?.permanent_bounces)
    || includesRecipient(result?.suppressed_recipients)
    || (!includesRecipient(result?.delivered) && !includesRecipient(result?.queued))) {
    throw new Error("Cloudflare did not accept the authentication email for delivery")
  }
}
