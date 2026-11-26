import { beforeAll, beforeEach, expect, it, vi } from "vitest"
import {
  generateKeyPair,
  exportJWK,
  SignJWT,
} from "@gorth-com/structure/cores/jose"
vi.mock("@/utils/environment", () => ({
  appUrl: "https://machine-service.example.test",
  oauthAudience: "https://machine-service.example.test",
  authUrl: "https://machine-auth.example.test",
  isProduction: true,
}))
import { verifyBackendRequest } from "@/lib/backend-oauth"
let pair: Awaited<ReturnType<typeof generateKeyPair>>
let key: Awaited<ReturnType<typeof exportJWK>>
beforeAll(async () => {
  pair = await generateKeyPair("ES256")
  key = {
    ...(await exportJWK(pair.publicKey)),
    kid: "machine-verification",
    alg: "ES256",
  }
})
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url !== "https://machine-auth.example.test/auth/jwks")
      throw new Error("Unexpected auth hop")
    return Response.json({ keys: [key] })
  })
})
async function token(override: Record<string, unknown> = {}, typ = "at+jwt") {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({
    iss: "https://machine-auth.example.test/auth",
    aud: "https://machine-service.example.test",
    sub: "existing-confidential-client",
    client_id: "existing-confidential-client",
    scope: "task:dispatch",
    iat: now,
    exp: now + 120,
    ...override,
  })
    .setProtectedHeader({ alg: "ES256", kid: "machine-verification", typ })
    .sign(pair.privateKey)
}
function request(
  bearer?: string,
  headers: Record<string, string | undefined> = {}
) {
  const wire = new Headers()
  for (const [key, value] of Object.entries(headers))
    if (value !== undefined) wire.set(key, value)
  if (bearer) wire.set("Authorization", `Bearer ${bearer}`)
  return new Request("https://machine-service.example.test/internal", {
    headers: wire,
  })
}

it("accepts an existing confidential client with the exact machine scope", async () => {
  expect(
    await verifyBackendRequest(request(await token()), "task:dispatch")
  ).toMatchObject({ client_id: "existing-confidential-client" })
})
it("does not require copying the existing client ID into receiver env", async () => {
  expect(
    await verifyBackendRequest(
      request(
        await token({
          client_id: "rotated-existing-client",
          sub: "rotated-existing-client",
        })
      ),
      "task:dispatch"
    )
  ).toMatchObject({ client_id: "rotated-existing-client" })
})
it.each([
  { sub: "normal-user", sid: "user-session" },
  { scope: "task:read" },
  { exp: 1 },
  { aud: "https://foreign.example.test" },
  { iss: "https://foreign.example.test/auth" },
  { iat: 9999999999, exp: 99999999999 },
  { cnf: { jkt: "dpop-bound" } },
])("rejects user/wrong-scope/expired/misbound grants %j", async (override) => {
  await expect(
    verifyBackendRequest(request(await token(override)), "task:dispatch")
  ).rejects.toBeTruthy()
})
it("rejects missing tokens, ID tokens and tampered signatures", async () => {
  await expect(
    verifyBackendRequest(request(), "task:dispatch")
  ).rejects.toBeTruthy()
  await expect(
    verifyBackendRequest(request(await token({}, "JWT")), "task:dispatch")
  ).rejects.toBeTruthy()
  const parts = (await token()).split(".")
  parts[2] = "A".repeat(parts[2]!.length)
  await expect(
    verifyBackendRequest(request(parts.join(".")), "task:dispatch")
  ).rejects.toBeTruthy()
})
it.each([
  { Cookie: "session=user" },
  { Origin: "https://machine-service.example.test" },
  { "Sec-Fetch-Site": "same-origin" },
])(
  "rejects browser request headers even with a valid machine token %j",
  async (headers) => {
    await expect(
      verifyBackendRequest(request(await token(), headers), "task:dispatch")
    ).rejects.toBeTruthy()
  }
)
