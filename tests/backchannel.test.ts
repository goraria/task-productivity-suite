import { beforeEach, expect, it, vi } from "vitest"
import { createLogoutVerifier } from "@gorth-com/structure/modules/auth/server"
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "@gorth-com/structure/cores/jose"

const fixture = vi.hoisted(() => ({ verify: vi.fn(), apply: vi.fn() }))
vi.mock("@/models/revocation", () => ({
  rawVerifyBackchannelLogoutToken: fixture.verify,
  rawEndSsoSessions: fixture.apply,
}))
import { POST } from "@/app/(api)/auth/sign-out/back-channel/route"

const issuer = "https://sso.example.test/auth"
const clientId = "gorth-task-productivity-suite"
const event = "http://schemas.openid.net/event/backchannel-logout"
let pair: Awaited<ReturnType<typeof generateKeyPair>>

beforeEach(async () => {
  vi.resetAllMocks()
  pair = await generateKeyPair("RS256")
  const publicKey = {
    ...(await exportJWK(pair.publicKey)),
    kid: "fixture-key",
    alg: "RS256",
  }
  const verifier = createLogoutVerifier({
    issuer,
    clientId,
    requireSid: false,
    getVerificationKey: async () => createLocalJWKSet({ keys: [publicKey] }),
    storage: { isRevoked: async () => false, apply: fixture.apply },
  })
  fixture.verify.mockImplementation((token) => verifier.verify(token))
  fixture.apply.mockResolvedValue(true)
})
async function token(
  overrides: Record<string, unknown> = {},
  signingKey = pair.privateKey
) {
  return new SignJWT({
    iss: issuer,
    aud: clientId,
    sub: "immutable-sso-sub",
    sid: "central-session",
    jti: "logout-receipt",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    events: { [event]: {} },
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", kid: "fixture-key", typ: "logout+jwt" })
    .sign(signingKey)
}
function send(value: string) {
  return POST(
    new Request("https://app.example.test/auth/sign-out/back-channel", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ logout_token: value }),
    })
  )
}
it("accepts signed logout without a browser cookie and links the SSO subject/SID", async () => {
  expect((await send(await token())).status).toBe(200)
  expect(fixture.apply).toHaveBeenCalledWith(
    expect.objectContaining({
      subject: "immutable-sso-sub",
      sid: "central-session",
      jti: "logout-receipt",
    })
  )
})
it("rejects a forged logout before changing sessions", async () => {
  const attacker = await generateKeyPair("RS256")
  expect((await send(await token({}, attacker.privateKey))).status).toBe(400)
  expect(fixture.apply).not.toHaveBeenCalled()
})
it("rejects a logout addressed to another application", async () => {
  expect((await send(await token({ aud: "another-app" }))).status).toBe(400)
  expect(fixture.apply).not.toHaveBeenCalled()
})
it("does not accept an ID token as a logout event", async () => {
  expect(
    (await send(await token({ events: {}, nonce: "id-token-nonce" }))).status
  ).toBe(400)
  expect(fixture.apply).not.toHaveBeenCalled()
})
it("requires exactly one form token", async () => {
  const response = await POST(
    new Request("https://app.example.test/auth/sign-out/back-channel", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "logout_token=one&logout_token=two",
    })
  )
  expect(response.status).toBe(400)
  expect(fixture.verify).not.toHaveBeenCalled()
})
it("bounds logout payloads independently of the normal API body limit", async () => {
  expect((await send("x".repeat(32769))).status).toBe(413)
  expect(fixture.apply).not.toHaveBeenCalled()
})
it("fails closed when verification/storage is unavailable", async () => {
  fixture.verify.mockRejectedValue(new Error("unavailable"))
  expect(await send("fixture")).toHaveProperty("status", 503)
})
