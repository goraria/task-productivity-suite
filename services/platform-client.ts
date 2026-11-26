import { CrudError } from "@/database/crud"
import { workerGrantSchema } from "@/schemas/platform"
import {
  oauthAudience,
  oauthResourceAudience,
  authUrl,
  isProduction,
  oauthDiscoveryAudience,
  oauthInsightAudience,
  oauthMediaAudience,
  oauthNotifyAudience,
  oauthClientId,
  oauthClientSecret,
} from "@/utils/environment"
import { fetcher } from "@/utils/fetcher"
import { clientCredentialsTokenRequest } from "better-auth/oauth2"
import "server-only"

const registry = {
  resource: oauthResourceAudience,
  notification: oauthNotifyAudience,
  discovery: oauthDiscoveryAudience,
  media: oauthMediaAudience,
  insight: oauthInsightAudience,
}
export type BackendDomain = keyof typeof registry | "task"
const scopes: Record<BackendDomain, string> = {
  task: "task:dispatch",
  resource: "task:resource:policy",
  notification: "task:notification:publish",
  discovery: "task:discovery:write",
  media: "task:media:delegate",
  insight: "task:insight:publish",
}
const tokens = new Map<string, { token: string; expires: number }>()
const tokenRequests = new Map<BackendDomain, Promise<string>>()
export function rawTrustedPlatformOrigin(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new CrudError(
      503,
      "platform_not_configured",
      "Platform service is not configured"
    )
  }
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
    throw new CrudError(
      503,
      "invalid_platform_origin",
      "Invalid platform origin"
    )
  return url.origin
}
export async function rawGetBackendAccessToken(domain: BackendDomain) {
  const resource = rawTrustedPlatformOrigin(
    domain === "task" ? oauthAudience : registry[domain]
  )
  if (!oauthClientId || !oauthClientSecret)
    throw new CrudError(
      503,
      "worker_not_configured",
      "Backend OAuth client is not configured"
    )
  const cached = tokens.get(domain)
  if (cached && cached.expires > Date.now() + 30000) return cached.token
  const existing = tokenRequests.get(domain)
  if (existing) return existing
  const request = requestWorkerToken(domain, resource)
  tokenRequests.set(domain, request)
  try {
    return await request
  } finally {
    tokenRequests.delete(domain)
  }
}
async function requestWorkerToken(domain: BackendDomain, resource: string) {
  const endpoint = new URL("/auth/oauth2/token", rawTrustedPlatformOrigin(authUrl))
    .href
  try {
    const request = await clientCredentialsTokenRequest({
      options: {
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
      },
      tokenEndpoint: endpoint,
      tokenEndpointAuth: { method: "client_secret_basic" },
      scope: scopes[domain],
      resource,
    })
    const response = await fetcher({
      url: endpoint,
      method: "POST",
      body: request.body,
      headers: request.headers,
      timeout: 10000,
      redirect: "error",
      cache: "no-store",
    })
    const result = workerGrantSchema.parse(response.data)
    tokens.set(domain, {
      token: result.access_token,
      expires: Date.now() + result.expires_in * 1000,
    })
    return result.access_token
  } catch {
    throw new CrudError(503, "worker_token_failed", "Worker grant failed")
  }
}
export async function rawPlatformRequest<T>(
  domain: keyof typeof registry,
  path: string,
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
  accessToken?: string
) {
  const url = new URL(rawTrustedPlatformOrigin(registry[domain]))
  if (
    !path.startsWith(`/${domain}/`) ||
    path.startsWith("//") ||
    path.includes("?")
  )
    throw new CrudError(400, "invalid_platform_path", "Invalid platform path")
  url.pathname = path
  if (!url.pathname.startsWith(`/${domain}/`))
    throw new CrudError(400, "invalid_platform_path", "Invalid platform path")
  const response = await fetcher<T>({
    url,
    method,
    body,
    headers: {
      Authorization: `Bearer ${accessToken ?? (await rawGetBackendAccessToken(domain))}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    redirect: "error",
    timeout: accessToken ? 15000 : 5000,
    validateStatus: () => true,
  })
  if (response.status === 401 && !accessToken) tokens.delete(domain)
  if (response.status < 200 || response.status >= 300)
    throw new CrudError(
      response.status >= 500 ? 503 : response.status,
      "platform_request_failed",
      "Platform service rejected the request"
    )
  return response.data
}
