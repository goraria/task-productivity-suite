import { NextRequest, NextResponse } from "next/server";
import {
  discoveryEngineServerUrl,
  notificationCenterServerUrl,
  resourceInteractionServerUrl,
  routes,
  serverUrl,
  ssoOAuthClientId,
} from "@/utils/environment";
import {
  createOAuthCodeChallenge,
  createOAuthCodeVerifier,
  createOAuthNonce,
  createAuthState,
  setAuthIssuerCookie,
  setAuthReturnToCookie,
  setAuthStateCookie,
  setOAuthVerifierCookie,
  setOAuthNonceCookie,
} from "@/lib/dal";
import { resolveInternalPath } from "@/utils/formatter";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  const isSignUp = mode === "sign-up" || mode === "register";
  const returnTo = resolveInternalPath(
    request.nextUrl.searchParams.get("returnTo") ??
      request.nextUrl.searchParams.get("redirect"),
  );
  const state = createAuthState();
  const verifier = createOAuthCodeVerifier();
  const nonce = createOAuthNonce();
  const redirectUri = new URL("/auth/exchange", request.url);
  const ssoOrigin = new URL(isSignUp ? routes.register : routes.login).origin;
  const expectedIssuer = new URL("/auth", ssoOrigin).toString();
  const authorizeUrl = new URL("/auth/oauth2/authorize", ssoOrigin);

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", ssoOAuthClientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri.toString());
  authorizeUrl.searchParams.set(
    "scope",
    "openid profile email offline_access task:read task:write",
  );
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("nonce", nonce);
  authorizeUrl.searchParams.set(
    "code_challenge",
    createOAuthCodeChallenge(verifier),
  );
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.append("resource", new URL(serverUrl).origin);
  if (discoveryEngineServerUrl) {
    authorizeUrl.searchParams.append("resource", new URL(discoveryEngineServerUrl).origin);
  }
  authorizeUrl.searchParams.append(
    "resource",
    new URL(resourceInteractionServerUrl).origin,
  );
  authorizeUrl.searchParams.append(
    "resource",
    new URL(notificationCenterServerUrl).origin,
  );
  if (isSignUp) {
    authorizeUrl.searchParams.set("prompt", "create");
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.headers.set("Cache-Control", "no-store");
  setAuthStateCookie(response, state);
  setOAuthVerifierCookie(response, verifier);
  setAuthReturnToCookie(response, returnTo);
  setAuthIssuerCookie(response, expectedIssuer);
  setOAuthNonceCookie(response, nonce);

  return response;
}
