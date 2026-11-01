import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import { authEmailConfigurationError, sendTransactionalEmail } from "../src/lib/cloudflare-email"

const config = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_EMAIL_API_TOKEN: "fixture-email-token",
  AUTH_EMAIL_FROM: "login@auth.example.com",
}
const message = { to: "reader@example.net", subject: "Sign in", text: "Your link", html: "<p>Your link</p>" }
const originalFetch = globalThis.fetch
const previous = Object.fromEntries(Object.keys(config).map((key) => [key, process.env[key]]))

beforeEach(() => { Object.assign(process.env, config) })
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function respond(body: unknown, status = 200) {
  const send = mock(async () => Response.json(body, { status }))
  globalThis.fetch = send as unknown as typeof fetch
  return send
}

test("configuration requires all three Cloudflare settings and validates the sender and account", () => {
  expect(authEmailConfigurationError(config)).toBe("")
  for (const key of Object.keys(config)) {
    expect(authEmailConfigurationError({ ...config, [key]: "" })).not.toBe("")
  }
  expect(authEmailConfigurationError({ ...config, CLOUDFLARE_ACCOUNT_ID: "invalid/account" })).toContain("account identifier")
  for (const from of ["1Router <login@auth.example.com>", "login@auth.example.com\r\nBcc:other@example.net"]) {
    expect(authEmailConfigurationError({ ...config, AUTH_EMAIL_FROM: from })).toContain("plain email address")
  }
})

test("missing configuration fails before contacting Cloudflare", async () => {
  delete process.env.CLOUDFLARE_EMAIL_API_TOKEN
  const send = respond({})
  await expect(sendTransactionalEmail(message)).rejects.toThrow("Cloudflare magic-link email requires")
  expect(send).not.toHaveBeenCalled()
})

test("sends the REST address shape, both message bodies, server token, and bounded request", async () => {
  let url: unknown
  let request: RequestInit | undefined
  globalThis.fetch = (async (input, init) => {
    url = input
    request = init
    return Response.json({ success: true, result: { delivered: [message.to] } })
  }) as typeof fetch
  await sendTransactionalEmail(message)
  expect(url).toBe(`https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`)
  expect(request?.method).toBe("POST")
  expect(new Headers(request?.headers).get("Authorization")).toBe(`Bearer ${config.CLOUDFLARE_EMAIL_API_TOKEN}`)
  expect(request?.signal).toBeInstanceOf(AbortSignal)
  expect(JSON.parse(request?.body as string)).toEqual({
    from: { address: config.AUTH_EMAIL_FROM, name: "OpenBookLM" },
    to: [message.to], subject: message.subject, text: message.text, html: message.html,
  })
})

test("queued delivery to the intended recipient is accepted", async () => {
  respond({ success: true, result: { queued: [message.to.toUpperCase()] } })
  await expect(sendTransactionalEmail(message)).resolves.toBeUndefined()
})

test("HTTP 200 with a bounce or suppression is never reported as a successful send", async () => {
  for (const field of ["permanent_bounces", "suppressed_recipients"]) {
    respond({ success: true, result: { delivered: [message.to], [field]: [message.to] } })
    await expect(sendTransactionalEmail(message)).rejects.toThrow("did not accept")
  }
})

test("malformed, failed, empty, and unrelated recipient responses fail closed", async () => {
  for (const body of [null, {}, { success: false }, { success: true, result: {} },
    { success: true, result: { delivered: ["someone-else@example.net"] } },
    { success: true, errors: [{ code: 1000 }], result: { delivered: [message.to] } }]) {
    respond(body)
    await expect(sendTransactionalEmail(message)).rejects.toThrow("did not accept")
  }
  globalThis.fetch = (async () => new Response("not JSON")) as typeof fetch
  await expect(sendTransactionalEmail(message)).rejects.toThrow("did not accept")
})

test("rate limits and provider failures expose no response body and are not retried", async () => {
  for (const status of [400, 403, 429, 500]) {
    const send = respond({ error: "private-login-url-and-recipient-details" }, status)
    await expect(sendTransactionalEmail(message)).rejects.toThrow(`Cloudflare authentication email delivery failed (HTTP ${status})`)
    expect(send).toHaveBeenCalledTimes(1)
  }
})

test("an ambiguous timeout is not retried", async () => {
  const send = mock(async () => { throw new DOMException("Timed out", "TimeoutError") })
  globalThis.fetch = send as unknown as typeof fetch
  await expect(sendTransactionalEmail(message)).rejects.toThrow("Timed out")
  expect(send).toHaveBeenCalledTimes(1)
})
