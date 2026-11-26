import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { v4 } from "@gorth/structure/cores/uuid"
import { cache } from "react"
import { cookies } from "next/headers"
import type { NextRequest, NextResponse } from "next/server"
import {
  accessTokenCookie,
  authMaxAge,
  authPreviousSecrets,
  authSecret,
  nodeEnv,
  oauthCodeVerifierCookie,
  oauthIssuerCookie,
  oauthNonceCookie,
  oauthReturnToCookie,
  oauthStateCookie,
  refreshTokenCookie,
  sessionAppCookie,
} from "@/utils/environment"
import {
  oauthAccessTokenMaxAge,
  oauthRefreshTokenMaxAge,
} from "@/lib/auth/oauth"
import type { AuthUser, OAuthTokenResponse } from "@/lib/auth/types"

const legacyAppAuthCookies = [
  "app-session",
  "gorth-access-token",
  "gorth-refresh-token",
  "gorth-app",
  "sb-access-auth-token",
  "sb-refresh-auth-token",
]
function getPositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number(value)

  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

const appSessionMaxAgeSeconds = getPositiveInteger(
  authMaxAge,
  oauthRefreshTokenMaxAge
)

export interface AppSession {
  user: AuthUser
  sso_sub: string
  email?: string
  sso_id_token?: string
  gorth_app?: Record<string, unknown>
  app_user_synced_at?: number
  sso_verified_at?: number
  issued_at: number
  expires_at: number
}

const minimumSecretLength = 32
let sessionKeys: Buffer[] | null = null

function getSessionKeys() {
  if (sessionKeys) return sessionKeys
  if (!authSecret) throw new Error("NEXT_AUTH_SECRET is required")

  const secrets = [
    authSecret,
    ...authPreviousSecrets.split(",").map((value) => value.trim()),
  ].filter(Boolean)

  for (const secret of secrets) {
    if (Buffer.byteLength(secret, "utf8") < minimumSecretLength) {
      throw new Error("NEXT_AUTH_SECRET values must be at least 32 bytes")
    }
  }

  sessionKeys = secrets.map((secret) =>
    createHash("sha256").update(secret).digest(),
  )
  return sessionKeys
}

function getSessionKey() {
  return getSessionKeys()[0]
}

function sealSession(session: AppSession) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getSessionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".")
}

function openSession(value: string): AppSession | null {
  const [ivValue, tagValue, encryptedValue] = value.split(".")

  if (!ivValue || !tagValue || !encryptedValue) return null

  for (const key of getSessionKeys()) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivValue, "base64url"),
      )
      decipher.setAuthTag(Buffer.from(tagValue, "base64url"))

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, "base64url")),
        decipher.final(),
      ])
      const session = JSON.parse(decrypted.toString("utf8")) as AppSession

      if (session.user?.id && session.expires_at > Date.now()) return session
    } catch {
      // Try the previous key during a rolling secret rotation.
    }
  }

  return null
}

export function createAppSession(
  user: AuthUser,
  gorthApp?: Record<string, unknown>,
  ssoIdToken?: string,
  appUserSyncedAt?: number,
  ssoVerifiedAt = Date.now()
): AppSession {
  const now = Date.now()

  return {
    user: {
      ...user,
      aud: "authenticated",
      app_metadata: user.app_metadata ?? {},
      user_metadata: user.user_metadata ?? {},
    },
    sso_sub: user.id,
    email: user.email,
    sso_id_token: ssoIdToken,
    gorth_app: gorthApp,
    app_user_synced_at: appUserSyncedAt,
    sso_verified_at: ssoVerifiedAt,
    issued_at: now,
    expires_at: now + appSessionMaxAgeSeconds * 1000,
  }
}

export const verifySession = cache(async () => {
  const cookieStore = await cookies()
  const value = cookieStore.get(sessionAppCookie)?.value
  return value ? openSession(value) : null
})

export const getUser = cache(async () => {
  const session = await verifySession()
  return session?.user ?? null
})

const sensitiveCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: nodeEnv === "production",
  path: "/",
}

export function setAppSessionCookie(
  response: NextResponse,
  session: AppSession
) {
  response.cookies.set(sessionAppCookie, sealSession(session), {
    ...sensitiveCookieOptions,
    maxAge: appSessionMaxAgeSeconds,
  })
  return response
}

export function clearAppAuthCookies(response: NextResponse) {
  for (const cookieName of [
    sessionAppCookie,
    accessTokenCookie,
    refreshTokenCookie,
    ...legacyAppAuthCookies,
  ]) {
    response.cookies.set(cookieName, "", {
      ...sensitiveCookieOptions,
      maxAge: 0,
    })
  }
  return response
}

export function setAuthTokenCookies(
  response: NextResponse,
  token: OAuthTokenResponse,
  currentRefreshToken?: string
) {
  const accessToken = token.access_token
  const refreshToken = token.refresh_token || currentRefreshToken

  if (!accessToken || !refreshToken) {
    throw new Error("missing_oauth_credentials")
  }

  const expiresFromTimestamp = token.expires_at
    ? Math.floor(token.expires_at - Date.now() / 1000)
    : null
  const accessTokenMaxAge = Math.max(
    1,
    expiresFromTimestamp && expiresFromTimestamp > 0
      ? expiresFromTimestamp
      : (token.expires_in ?? oauthAccessTokenMaxAge)
  )
  const refreshTokenMaxAge = Math.max(
    1,
    token.refresh_token_expires_in ?? oauthRefreshTokenMaxAge
  )

  response.cookies.set(accessTokenCookie, accessToken, {
    ...sensitiveCookieOptions,
    maxAge: accessTokenMaxAge,
  })
  response.cookies.set(refreshTokenCookie, refreshToken, {
    ...sensitiveCookieOptions,
    maxAge: refreshTokenMaxAge,
  })

  return response
}

export function createAuthState() {
  return v4()
}

export function createOAuthCodeVerifier() {
  return randomBytes(32).toString("base64url")
}

export function createOAuthNonce() {
  return randomBytes(32).toString("base64url")
}

export function createOAuthCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url")
}

const transientCookieOptions = {
  ...sensitiveCookieOptions,
  path: "/auth",
  maxAge: 5 * 60,
}

export function setAuthStateCookie(response: NextResponse, state: string) {
  response.cookies.set(oauthStateCookie, state, transientCookieOptions)
  return response
}

export function setOAuthVerifierCookie(
  response: NextResponse,
  verifier: string
) {
  response.cookies.set(
    oauthCodeVerifierCookie,
    verifier,
    transientCookieOptions
  )
  return response
}

export function setAuthReturnToCookie(
  response: NextResponse,
  returnTo: string
) {
  response.cookies.set(oauthReturnToCookie, returnTo, transientCookieOptions)
  return response
}

export function setAuthIssuerCookie(response: NextResponse, issuer: string) {
  response.cookies.set(oauthIssuerCookie, issuer, transientCookieOptions)
  return response
}

export function setOAuthNonceCookie(response: NextResponse, nonce: string) {
  response.cookies.set(oauthNonceCookie, nonce, transientCookieOptions)
  return response
}

export function clearAuthStateCookie(response: NextResponse) {
  for (const cookieName of [
    oauthStateCookie,
    oauthCodeVerifierCookie,
    oauthReturnToCookie,
    oauthIssuerCookie,
    oauthNonceCookie,
  ]) {
    response.cookies.set(cookieName, "", {
      ...transientCookieOptions,
      maxAge: 0,
    })
  }
  return response
}

export function isValidAuthState(request: NextRequest, state: string | null) {
  const expected = request.cookies.get(oauthStateCookie)?.value
  if (!state || !expected) return false

  const receivedBuffer = Buffer.from(state)
  const expectedBuffer = Buffer.from(expected)
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

export function getOAuthCodeVerifier(request: NextRequest) {
  return request.cookies.get(oauthCodeVerifierCookie)?.value ?? null
}

export function getAuthReturnTo(request: NextRequest) {
  return request.cookies.get(oauthReturnToCookie)?.value ?? "/"
}

export function getAuthIssuer(request: NextRequest) {
  return request.cookies.get(oauthIssuerCookie)?.value ?? null
}

export function getOAuthNonce(request: NextRequest) {
  return request.cookies.get(oauthNonceCookie)?.value ?? null
}
