import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  notificationCenterServerUrl,
  resourceInteractionServerUrl,
  routes,
  serverUrl,
  ssoOAuthClientId,
} from "@/lib/environment";
import {
  getErrorStatus,
  getPayloadValue,
  normalizeIssuer,
  resolveInternalPath,
} from "@/utils/formatter";
import {
  clearAppAuthCookies,
  clearAuthStateCookie,
  createAppSession,
  getAuthIssuer,
  getAuthReturnTo,
  getOAuthCodeVerifier,
  getOAuthNonce,
  isValidAuthState,
  setAppSessionCookie,
  setAuthTokenCookies,
} from "@/lib/dal";
import {
  getOAuthUserInfo,
  readOAuthError,
  syncAppUser,
} from "@/lib/auth/oauth";
import type {
  AuthUser,
  OAuthTokenResponse,
  SsoExchangeResponse,
} from "@/lib/auth/types";

import {
  exchangeRouteAuthorizationCode,
  getRouteJwks,
  getRouteOpenIdConfiguration,
} from "@/services/route";

export const runtime = "nodejs";

interface OAuthDiscoveryMetadata {
  issuer?: string;
  jwks_uri?: string;
  id_token_signing_alg_values_supported?: string[];
}

interface OAuthJsonWebKey extends JsonWebKey {
  kid?: string;
  alg?: string;
}

interface JsonWebKeySet {
  keys?: OAuthJsonWebKey[];
}

interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface JwtClaims {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  azp?: string;
  scope?: string;
  email?: string;
  nonce?: string;
  at_hash?: string;
  c_hash?: string;
}

function noStoreJson(payload: Record<string, unknown>, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function rejectTokenQuery(request: NextRequest) {
  return (
    request.nextUrl.searchParams.has("token") ||
    request.nextUrl.searchParams.has("access_token") ||
    request.nextUrl.searchParams.has("sso_token") ||
    request.nextUrl.searchParams.has("refresh_token")
  );
}

async function getExchangePayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return request.formData();
  }

  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getSsoOrigin() {
  return new URL(routes.login).origin;
}

function getResourceAudience() {
  return new URL(serverUrl).origin;
}

function getResourceAudiences() {
  return [
    ...new Set([
      getResourceAudience(),
      new URL(resourceInteractionServerUrl).origin,
      new URL(notificationCenterServerUrl).origin,
    ]),
  ];
}

function assertExpectedIssuer(request: NextRequest, issuer: string | null) {
  const returnedIssuer = normalizeIssuer(issuer);
  const expectedIssuer = normalizeIssuer(
    getAuthIssuer(request) ?? new URL("/auth", getSsoOrigin()).toString(),
  );

  if (!returnedIssuer || !expectedIssuer || returnedIssuer !== expectedIssuer) {
    throw new Error("invalid_issuer");
  }

  return returnedIssuer;
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(decodeBase64Url(value).toString("utf8")) as T;
}

function getJwtParts(token: string) {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new Error("invalid_jwt");
  }

  return {
    headerValue: header,
    payloadValue: payload,
    signatureValue: signature,
    header: decodeJwtPart<JwtHeader>(header),
    payload: decodeJwtPart<JwtClaims>(payload),
  };
}

function hasAudience(audience: JwtClaims["aud"], expected: string) {
  return Array.isArray(audience)
    ? audience.includes(expected)
    : audience === expected;
}

function assertJwtClaims(
  claims: JwtClaims,
  expectedIssuer: string,
  expectedAudience: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const clockSkewSeconds = 60;

  if (normalizeIssuer(claims.iss) !== expectedIssuer) {
    throw new Error("invalid_jwt_issuer");
  }

  if (!hasAudience(claims.aud, expectedAudience)) {
    throw new Error("invalid_jwt_audience");
  }

  if (!claims.sub) {
    throw new Error("invalid_jwt_subject");
  }

  if (typeof claims.exp !== "number" || claims.exp <= now - clockSkewSeconds) {
    throw new Error("expired_jwt");
  }

  if (typeof claims.nbf === "number" && claims.nbf > now + clockSkewSeconds) {
    throw new Error("inactive_jwt");
  }
}

function getOidcTokenHash(value: string, algorithm: string) {
  const hashAlgorithm = algorithm.endsWith("256")
    ? "sha256"
    : algorithm.endsWith("384")
      ? "sha384"
      : "sha512";
  const digest = createHash(hashAlgorithm).update(value).digest();
  return digest.subarray(0, digest.length / 2).toString("base64url");
}

function assertIdTokenBinding(
  claims: JwtClaims,
  algorithm: string,
  expectedNonce: string,
  accessToken: string,
  authorizationCode: string,
) {
  if (claims.nonce !== expectedNonce) {
    throw new Error("invalid_id_token_nonce");
  }

  if (
    (claims.azp && claims.azp !== ssoOAuthClientId) ||
    (Array.isArray(claims.aud) &&
      claims.aud.length > 1 &&
      claims.azp !== ssoOAuthClientId)
  ) {
    throw new Error("invalid_id_token_azp");
  }

  if (
    claims.at_hash &&
    claims.at_hash !== getOidcTokenHash(accessToken, algorithm)
  ) {
    throw new Error("invalid_id_token_at_hash");
  }

  if (
    claims.c_hash &&
    claims.c_hash !== getOidcTokenHash(authorizationCode, algorithm)
  ) {
    throw new Error("invalid_id_token_c_hash");
  }
}

function getJwtAlgorithm(alg: string) {
  switch (alg) {
    case "RS256":
      return {
        importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
      };
    case "RS384":
      return {
        importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
        verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
      };
    case "RS512":
      return {
        importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
        verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
      };
    case "PS256":
      return {
        importAlgorithm: { name: "RSA-PSS", hash: "SHA-256" },
        verifyAlgorithm: { name: "RSA-PSS", saltLength: 32 },
      };
    case "PS384":
      return {
        importAlgorithm: { name: "RSA-PSS", hash: "SHA-384" },
        verifyAlgorithm: { name: "RSA-PSS", saltLength: 48 },
      };
    case "PS512":
      return {
        importAlgorithm: { name: "RSA-PSS", hash: "SHA-512" },
        verifyAlgorithm: { name: "RSA-PSS", saltLength: 64 },
      };
    case "ES256":
      return {
        importAlgorithm: { name: "ECDSA", namedCurve: "P-256" },
        verifyAlgorithm: { name: "ECDSA", hash: "SHA-256" },
      };
    case "ES384":
      return {
        importAlgorithm: { name: "ECDSA", namedCurve: "P-384" },
        verifyAlgorithm: { name: "ECDSA", hash: "SHA-384" },
      };
    case "ES512":
      return {
        importAlgorithm: { name: "ECDSA", namedCurve: "P-521" },
        verifyAlgorithm: { name: "ECDSA", hash: "SHA-512" },
      };
    case "EdDSA":
      return {
        importAlgorithm: { name: "Ed25519" },
        verifyAlgorithm: { name: "Ed25519" },
      };
    default:
      throw new Error("unsupported_jwt_algorithm");
  }
}

async function loadOpenIdConfiguration(issuer: string) {
  const response =
    await getRouteOpenIdConfiguration<OAuthDiscoveryMetadata>(issuer);

  if (response.status < 200 || response.status >= 300) {
    throw new Error("openid_configuration_failed");
  }

  const metadata = response.data;

  if (normalizeIssuer(metadata.issuer) !== issuer || !metadata.jwks_uri) {
    throw new Error("invalid_openid_configuration");
  }

  return metadata;
}

async function loadJwks(jwksUri: string) {
  const response = await getRouteJwks<JsonWebKeySet>(jwksUri);

  if (response.status < 200 || response.status >= 300) {
    throw new Error("jwks_failed");
  }

  const jwks = response.data;

  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error("invalid_jwks");
  }

  return jwks;
}

function findJwk(jwks: JsonWebKeySet, header: JwtHeader) {
  const key = jwks.keys?.find((item) => {
    if (header.kid && item.kid !== header.kid) {
      return false;
    }

    return !header.alg || !item.alg || item.alg === header.alg;
  });

  if (!key) {
    throw new Error("jwk_not_found");
  }

  return key;
}

async function verifyJwt(
  token: string,
  expectedIssuer: string,
  expectedAudience: string,
  metadata: OAuthDiscoveryMetadata,
) {
  const jwt = getJwtParts(token);

  if (!jwt.header.alg) {
    throw new Error("missing_jwt_algorithm");
  }

  assertJwtClaims(jwt.payload, expectedIssuer, expectedAudience);

  const jwks = await loadJwks(metadata.jwks_uri!);
  const jwk = findJwk(jwks, jwt.header);
  const algorithm = getJwtAlgorithm(jwt.header.alg);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    algorithm.importAlgorithm,
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    algorithm.verifyAlgorithm,
    key,
    decodeBase64Url(jwt.signatureValue),
    new TextEncoder().encode(`${jwt.headerValue}.${jwt.payloadValue}`),
  );

  if (!verified) {
    throw new Error("invalid_jwt_signature");
  }

  return jwt.payload;
}

async function exchangeCode(
  request: NextRequest,
  code: string,
  codeVerifier: string,
) {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", ssoOAuthClientId);
  body.set("code", code);
  body.set("code_verifier", codeVerifier);
  body.set("redirect_uri", new URL("/auth/exchange", request.url).toString());
  for (const resource of getResourceAudiences()) {
    body.append("resource", resource);
  }

  const response =
    await exchangeRouteAuthorizationCode<OAuthTokenResponse>(body);

  if (response.status < 200 || response.status >= 300) {
    const detail = await readOAuthError(response.data);
    throw Object.assign(new Error("oauth_code_exchange_failed"), {
      status: response.status,
      oauthError: detail?.error,
      oauthDescription: detail?.error_description,
    });
  }

  return response.data;
}

function createSsoPayload(
  request: NextRequest,
  token: OAuthTokenResponse,
  user: AuthUser,
  next: string,
): SsoExchangeResponse {
  return {
    user,
    sso_sub: user.id,
    email: user.email,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    id_token: token.id_token,
    expires_in: token.expires_in,
    expires_at: token.expires_at,
    refresh_token_expires_in: token.refresh_token_expires_in,
    scope: token.scope,
    gorth_app: {
      id: ssoOAuthClientId,
      origin: request.nextUrl.origin,
      redirect_uri: new URL("/auth/exchange", request.url).toString(),
      next,
      provider: "better-auth-oauth-provider",
      issued_at: Date.now(),
    },
  };
}

function setNoStoreHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function createExchangeResponseInner(
  request: NextRequest,
  code: string,
  state: string | null,
  issuer: string | null,
  next: string,
) {
  if (!isValidAuthState(request, state)) {
    return noStoreJson({ error: "invalid_state" }, 403);
  }

  if (!code) {
    return noStoreJson({ error: "missing_code" }, 400);
  }

  const codeVerifier = getOAuthCodeVerifier(request);

  if (!codeVerifier) {
    return noStoreJson({ error: "missing_code_verifier" }, 400);
  }

  const expectedNonce = getOAuthNonce(request);

  if (!expectedNonce) {
    return noStoreJson({ error: "missing_nonce" }, 400);
  }

  let payload: SsoExchangeResponse;

  try {
    const expectedIssuer = assertExpectedIssuer(request, issuer);
    const openIdConfig = await loadOpenIdConfiguration(expectedIssuer);
    const token = await exchangeCode(request, code, codeVerifier);

    if (
      token.token_type?.toLowerCase() !== "bearer" ||
      !token.access_token ||
      !token.refresh_token ||
      !token.id_token
    ) {
      return noStoreJson({ error: "invalid_oauth_token_response" }, 502);
    }

    let idTokenClaims: JwtClaims;

    try {
      idTokenClaims = await verifyJwt(
        token.id_token,
        expectedIssuer,
        ssoOAuthClientId,
        openIdConfig,
      );
      const idTokenAlgorithm = getJwtParts(token.id_token).header.alg;
      if (!idTokenAlgorithm) throw new Error("missing_jwt_algorithm");
      if (
        openIdConfig.id_token_signing_alg_values_supported?.length &&
        !openIdConfig.id_token_signing_alg_values_supported.includes(
          idTokenAlgorithm,
        )
      ) {
        throw new Error("unsupported_id_token_algorithm");
      }
      assertIdTokenBinding(
        idTokenClaims,
        idTokenAlgorithm,
        expectedNonce,
        token.access_token,
        code,
      );
    } catch {
      return noStoreJson({ error: "invalid_id_token" }, 401);
    }

    try {
      await verifyJwt(
        token.access_token,
        expectedIssuer,
        getResourceAudience(),
        openIdConfig,
      );
    } catch {
      return noStoreJson({ error: "invalid_access_token" }, 401);
    }

    const userInfo = await getOAuthUserInfo(token.access_token);
    const user = userInfo.user;

    if (!user || user.id !== idTokenClaims.sub) {
      throw Object.assign(new Error("oauth_userinfo_failed"), {
        status: userInfo.status,
        oauthError: userInfo.error?.error,
        oauthDescription: userInfo.error?.error_description,
      });
    }

    await syncAppUser(token.access_token);
    payload = createSsoPayload(request, token, user, next);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "oauth_code_exchange_failed"
    ) {
      const status = getErrorStatus(error);
      const detail = error as Error & {
        oauthError?: string;
        oauthDescription?: string;
      };

      console.error("[auth] SSO authorization-code exchange failed", {
        endpoint: "/auth/oauth2/token",
        status,
        error: detail.oauthError,
        description: detail.oauthDescription,
      });

      if (status && status >= 500) {
        return noStoreJson({ error: "oauth_token_failed" }, 502);
      }

      return noStoreJson({ error: "invalid_code" }, 401);
    }

    if (error instanceof Error && error.message === "oauth_userinfo_failed") {
      const detail = error as Error & {
        status?: number;
        oauthError?: string;
        oauthDescription?: string;
      };

      console.error("[auth] SSO userinfo failed during code exchange", {
        endpoint: "/auth/oauth2/userinfo",
        status: detail.status,
        error: detail.oauthError,
        description: detail.oauthDescription,
      });
      return noStoreJson({ error: "oauth_userinfo_failed" }, 502);
    }

    if (
      error instanceof Error &&
      ["app_user_sync_failed", "missing_app_server_url"].includes(error.message)
    ) {
      return noStoreJson({ error: error.message }, 502);
    }

    if (error instanceof Error && error.message === "invalid_issuer") {
      return noStoreJson({ error: "invalid_issuer" }, 401);
    }

    return noStoreJson({ error: "sso_unreachable" }, 502);
  }

  const user = payload.user;

  if (!user || !payload.access_token || !payload.refresh_token) {
    return noStoreJson({ error: "invalid_sso_response" }, 502);
  }

  const response = setNoStoreHeaders(
    NextResponse.redirect(new URL(next, request.url)),
  );
  clearAuthStateCookie(response);
  clearAppAuthCookies(response);
  setAuthTokenCookies(response, payload);
  setAppSessionCookie(
    response,
    createAppSession(user, payload.gorth_app, payload.id_token, Date.now()),
  );

  return response;
}

async function createExchangeResponse(
  request: NextRequest,
  code: string,
  state: string | null,
  issuer: string | null,
  next: string,
) {
  const response = await createExchangeResponseInner(
    request,
    code,
    state,
    issuer,
    next,
  );
  clearAuthStateCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  if (rejectTokenQuery(request)) {
    const response = noStoreJson({ error: "token_query_rejected" }, 400);
    clearAuthStateCookie(response);
    return response;
  }

  const authorizationError = request.nextUrl.searchParams.get("error")?.trim();
  if (authorizationError) {
    const state = request.nextUrl.searchParams.get("state");
    let response: NextResponse;

    if (!isValidAuthState(request, state)) {
      response = noStoreJson({ error: "invalid_state" }, 403);
    } else {
      try {
        assertExpectedIssuer(request, request.nextUrl.searchParams.get("iss"));
        const description = request.nextUrl.searchParams
          .get("error_description")
          ?.trim()
          .slice(0, 500);
        response = noStoreJson(
          {
            error: authorizationError,
            ...(description ? { error_description: description } : {}),
          },
          400,
        );
      } catch {
        response = noStoreJson({ error: "invalid_issuer" }, 401);
      }
    }

    clearAuthStateCookie(response);
    return response;
  }

  return createExchangeResponse(
    request,
    request.nextUrl.searchParams.get("code")?.trim() ?? "",
    request.nextUrl.searchParams.get("state"),
    request.nextUrl.searchParams.get("iss"),
    resolveInternalPath(getAuthReturnTo(request)),
  );
}

export async function POST(request: NextRequest) {
  const payload = await getExchangePayload(request);

  return createExchangeResponse(
    request,
    getPayloadValue(payload, "code"),
    getPayloadValue(payload, "state"),
    getPayloadValue(payload, "iss"),
    resolveInternalPath(
      getPayloadValue(payload, "next") || getAuthReturnTo(request),
    ),
  );
}
