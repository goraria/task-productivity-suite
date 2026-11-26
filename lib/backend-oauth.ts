import "server-only"
import {
  requestToResourceInput,
  verifyAccessTokenRequest,
  isInsufficientScopeError,
} from "better-auth/oauth2"
import {
  appUrl,
  oauthAudience,
  authUrl,
  isProduction,
} from "@/utils/environment"
import { CrudError } from "@/database/crud"

/** Better Auth owns JWT/JWKS/scope verification; this is machine-only authorization. */
export async function verifyBackendRequest(
  request: Request,
  scope: string,
  path = "",
  maxAge = 600
) {
  let audience: string
  let issuer: string
  let jwksUrl: string
  try {
    for (const raw of [appUrl, authUrl, ...(path ? [] : [oauthAudience])]) {
      const url = new URL(raw)
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/" ||
        (url.protocol !== "https:" &&
          (isProduction ||
            url.protocol !== "http:" ||
            !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
      )
        throw new Error()
    }
    audience = path ? new URL(path, appUrl).href : new URL(oauthAudience).origin
    issuer = new URL("/auth", authUrl).href.replace(/\/$/, "")
    jwksUrl = new URL("/auth/jwks", authUrl).href
  } catch {
    throw new CrudError(
      503,
      "backend_oauth_not_configured",
      "Backend OAuth is not configured"
    )
  }
  if (
    ["cookie", "origin", "sec-fetch-site"].some((header) =>
      request.headers.has(header)
    )
  )
    throw new CrudError(
      403,
      "machine_request_required",
      "Browser sessions cannot perform this operation"
    )
  const input = requestToResourceInput(request)
  if (
    !input.authorizationHeader ||
    !/^Bearer [^\s]+$/i.test(input.authorizationHeader)
  )
    throw new CrudError(
      401,
      "unauthorized",
      "A machine access token is required"
    )
  input.authorizationHeader = "Bearer " + input.authorizationHeader.slice(7)
  let claims
  try {
    claims = await verifyAccessTokenRequest(input, {
      jwksUrl,
      requiredScopes: [scope],
      verifyOptions: {
        issuer,
        audience,
        typ: "at+jwt",
        algorithms: ["RS256", "ES256", "EdDSA"],
        requiredClaims: ["iss", "aud", "sub", "client_id", "iat", "exp"],
        maxTokenAge: maxAge,
      },
    })
  } catch (error) {
    if (isInsufficientScopeError(error))
      throw new CrudError(
        403,
        "insufficient_scope",
        "The machine grant lacks the required scope"
      )
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : ""
    throw new CrudError(
      /^(ERR_JWT|ERR_JWS|ERR_JOSE|ERR_JWKS_NO_MATCHING_KEY)/.test(code)
        ? 401
        : 503,
      "backend_token_verification_failed",
      "Machine token verification failed"
    )
  }
  if (
    typeof claims.client_id !== "string" ||
    !claims.client_id ||
    claims.sub !== claims.client_id ||
    claims.sid !== undefined ||
    typeof claims.scope !== "string" ||
    !claims.scope.split(" ").includes(scope) ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > maxAge ||
    (claims.status !== undefined && claims.status !== "active")
  )
    throw new CrudError(
      403,
      "forbidden_machine_grant",
      "This machine grant is not authorized"
    )
  return claims
}
