import "server-only"

import { serverUrl, ssoServerUrl } from "@/utils/environment"
import {
  fetcher,
  toWebResponse,
  type FetcherOptions,
} from "@/utils/fetcher"

function getSsoServerBaseUrl() {
  if (!ssoServerUrl) throw new Error("missing_sso_server_url")
  return ssoServerUrl
}

function getAppServerBaseUrl() {
  if (!serverUrl) throw new Error("missing_app_server_url")
  return serverUrl
}

export function getRouteOpenIdConfiguration<TData>(issuer: string) {
  return fetcher<TData>({
    url: `${issuer}/.well-known/openid-configuration`,
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function getRouteJwks<TData>(jwksUri: string) {
  return fetcher<TData>({
    url: jwksUri,
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function exchangeRouteAuthorizationCode<TData>(body: URLSearchParams) {
  return fetcher<TData, URLSearchParams>({
    url: new URL("/auth/oauth2/token", getSsoServerBaseUrl()),
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function syncRouteAppUser(accessToken: string) {
  return fetcher({
    url: new URL("/auth/sync-user", getAppServerBaseUrl()),
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function getRouteOAuthUserInfo<TData>(accessToken: string) {
  return fetcher<TData>({
    url: new URL("/auth/oauth2/userinfo", getSsoServerBaseUrl()),
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function refreshRouteOAuthToken<TData>(body: URLSearchParams) {
  return fetcher<TData, URLSearchParams>({
    url: new URL("/auth/oauth2/token", getSsoServerBaseUrl()),
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function revokeRouteOAuthToken(body: URLSearchParams) {
  return fetcher({
    url: new URL("/auth/oauth2/revoke", getSsoServerBaseUrl()),
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export async function forwardRouteRequest(options: {
  url: URL
  method: string
  headers: Headers
  body?: ArrayBuffer
}) {
  const response = await fetcher<ArrayBuffer, ArrayBuffer | undefined>({
    url: options.url,
    method: options.method as FetcherOptions["method"],
    headers: Object.fromEntries(options.headers),
    body: options.body,
    redirect: "manual",
    cache: "no-store",
    responseType: "arraybuffer",
    validateStatus: () => true,
  })

  return toWebResponse(response)
}
