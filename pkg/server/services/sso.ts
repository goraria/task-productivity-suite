import {
  requestToResourceInput,
  verifyAccessTokenRequest,
} from "better-auth/oauth2"
import { createRemoteJWKSet, jwtVerify } from "@gorth/principle/cores/jose"

import {
  authUrl,
  oauthReadScope,
  oauthWriteScope,
  serverUrl,
  ssoClientUrl,
  ssoOAuthClientId,
  ssoServerUrl,
} from "@/utils/environment"
import { normalizeUrl } from "@/utils/formatter"
import { databaseDpopReplayStore } from "@/lib/auth/dpop-replay-store"

const backchannelLogoutEvent =
  "http://schemas.openid.net/event/backchannel-logout"

export function getOAuthProtectedResourceMetadata() {
  return {
    resource: getExpectedAudience(),
    authorization_servers: [getExpectedIssuer()],
    scopes_supported: [oauthReadScope, oauthWriteScope],
    bearer_methods_supported: ["header"],
  }
}

export interface SsoAccessTokenClaims {
  iss?: string
  sub: string
  sid?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  scope?: string
  email?: string
  name?: string | null
  preferred_username?: string | null
  status?: "active" | "inactive" | "suspended" | "deleted"
  picture?: string | null
  user_metadata?: Record<string, unknown>
  gorth_app?: Record<string, unknown>
  [key: string]: unknown
}

interface OpenIdConfiguration {
  issuer: string
  jwks_uri: string
}

let openIdConfigurationPromise: Promise<OpenIdConfiguration> | undefined
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

function getExpectedIssuer() {
  const baseUrl = ssoClientUrl ?? authUrl
  if (!baseUrl) throw new Error("missing_sso_client_url")
  return normalizeUrl(new URL("/auth", baseUrl).toString())
}

function getExpectedAudience() {
  if (!serverUrl) throw new Error("missing_server_url")
  return new URL(serverUrl).origin
}

async function getOpenIdConfiguration() {
  if (openIdConfigurationPromise) return openIdConfigurationPromise

  const issuer = getExpectedIssuer()
  openIdConfigurationPromise = (async () => {
    const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!response.ok) throw new Error("openid_configuration_failed")
    const metadata = (await response.json()) as Partial<OpenIdConfiguration>
    if (normalizeUrl(metadata.issuer ?? "") !== issuer || !metadata.jwks_uri) {
      throw new Error("invalid_openid_configuration")
    }
    return { issuer, jwks_uri: new URL(metadata.jwks_uri).toString() }
  })()

  try {
    return await openIdConfigurationPromise
  } catch (error) {
    openIdConfigurationPromise = undefined
    throw error
  }
}

async function getJwks() {
  if (jwks) return jwks
  const metadata = await getOpenIdConfiguration()
  jwks = createRemoteJWKSet(new URL(metadata.jwks_uri))
  return jwks
}

export async function verifySsoAccessTokenRequest(
  request: globalThis.Request,
  requiredScopes: string[],
  accessToken?: string
) {
  const input = requestToResourceInput(request)
  if (!input.authorizationHeader && accessToken) {
    input.authorizationHeader = `Bearer ${accessToken}`
  }
  const metadata = await getOpenIdConfiguration()

  return (await verifyAccessTokenRequest(input, {
    jwksUrl: metadata.jwks_uri,
    verifyOptions: {
      issuer: metadata.issuer,
      audience: getExpectedAudience(),
    },
    requiredScopes,
    dpop: { replayStore: databaseDpopReplayStore },
  })) as SsoAccessTokenClaims
}

export async function getSsoUserInfo(accessToken: string) {
  if (!ssoServerUrl) throw new Error("missing_sso_server_url")
  const response = await fetch(new URL("/auth/oauth2/userinfo", ssoServerUrl), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })
  if (!response.ok) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? "invalid_access_token"
        : "sso_userinfo_failed"
    )
  }
  return (await response.json()) as SsoAccessTokenClaims
}

export async function verifyBackchannelLogoutToken(token: string) {
  if (!ssoOAuthClientId) throw new Error("missing_sso_oauth_client_id")
  const { payload, protectedHeader } = await jwtVerify(token, await getJwks(), {
    issuer: getExpectedIssuer(),
    audience: ssoOAuthClientId,
    maxTokenAge: "120 seconds",
    typ: "logout+jwt",
  })
  const events = payload.events as Record<string, unknown> | undefined
  if (
    protectedHeader.typ !== "logout+jwt" ||
    !events?.[backchannelLogoutEvent] ||
    payload.nonce !== undefined ||
    typeof payload.jti !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    (!payload.sub && !payload.sid)
  ) {
    throw new Error("invalid_logout_token")
  }
  return {
    jti: payload.jti,
    sid: payload.sid,
    sub: typeof payload.sub === "string" ? payload.sub : null,
    expiresAt: new Date((payload.exp ?? 0) * 1000),
  }
}
