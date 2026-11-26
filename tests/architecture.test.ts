import { readFileSync } from "node:fs"
import { expect, it } from "vitest"
const read = (file: string) =>
  readFileSync(new URL("../" + file, import.meta.url), "utf8")
it("preserves Task caller/fetcher and uses root Next/Hono", () => {
  expect(read("utils/caller.tsx")).toContain("formatApiPath(url)")
  expect(read("utils/fetcher.ts")).toBe(
    read("pkg/client/utils/fetcher.ts").replaceAll("@gorth/", "@gorth-com/")
  )
  expect(read("app/(api)/internal/[[...route]]/route.ts")).toContain(
    "@hono/vercel"
  )
  expect(JSON.parse(read("package.json")).scripts.build).toBe("next build")
  expect(JSON.parse(read("package.json")).scripts.dev).toBe(
    "next dev --port 3034"
  )
  expect(JSON.parse(read("tsconfig.json")).exclude).toContain("pkg")
})
it("keeps central identity in SSO and native sessions/tokens in the app backend", () => {
  expect(read("lib/auth/provider.ts")).toContain('prompt: "select_account"')
  expect(read("lib/auth/provider.ts")).toContain("disableProviderLogout: true")
  expect(read("lib/auth/server/index.ts")).toContain("encryptOAuthTokens: true")
  expect(read("lib/auth/server/index.ts")).toContain(
    "emailAndPassword: { enabled: false }"
  )
  expect(read("lib/auth/server/index.ts")).toContain('"/get-access-token"')
  expect(read("models/user.ts")).not.toMatch(/\bor\(/)
  expect(read("proxy.ts")).not.toContain("fetch(")
})
it("does not watch Next output or the archived apps through Tailwind", () => {
  expect(read("styles/globals.css")).not.toContain("../**/*.{ts,tsx}")
  expect(read("styles/globals.css")).toContain(
    '@import "@gorth-com/primitive/globals.css"'
  )
})

it("does not expose legacy domain identity mutation endpoints", () => {
  expect(read("routes/users.ts")).not.toMatch(
    /router\.(post|put|patch|delete)\(/
  )
})
