import type {
  ApiErrorPayload,
  AuthUser,
  CallerMethod,
  CallerToastConfig,
  EndpointFetchArgs,
  SsoExchangeResponse,
} from "@/utils/interface"

export function resolveInternalPath(value: unknown, fallback = "/") {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : fallback
}

export function isRouteMatch(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function isPublicRoute(
  pathname: string,
  publicPrefixes: readonly string[]
) {
  return (
    pathname === "/" ||
    publicPrefixes.some((prefix) => isRouteMatch(pathname, prefix))
  )
}

export function normalizeIssuer(value: string | null | undefined) {
  if (!value) return null

  try {
    return new URL(value).toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

export function getErrorStatus(error: unknown) {
  return error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null
}

export function getPayloadValue(
  payload: FormData | Record<string, unknown>,
  key: string
) {
  const value = payload instanceof FormData ? payload.get(key) : payload[key]
  return typeof value === "string" ? value.trim() : ""
}

export function getSafeHeaders(
  headers: Headers,
  hiddenHeaders: readonly string[] = ["authorization", "cookie"]
) {
  const hidden = new Set(hiddenHeaders.map((header) => header.toLowerCase()))

  return Object.fromEntries(
    Array.from(headers.entries()).filter(
      ([key]) => !hidden.has(key.toLowerCase())
    )
  )
}

export function buildEndSessionUrl({
  issuer,
  idToken,
  clientId,
  postLogoutRedirectUri,
}: {
  issuer: string
  idToken?: string
  clientId: string
  postLogoutRedirectUri: string
}) {
  if (!idToken) return null

  const url = new URL("/auth/oauth2/end-session", issuer)
  url.searchParams.set("id_token_hint", idToken)
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri)
  return url.toString()
}

export function isTimestampRecent(
  value: number | undefined,
  maxAgeMs: number,
  now = Date.now()
) {
  return Boolean(value && now - value < maxAgeMs)
}

export function parseBoolean(value: string | undefined, fallback: boolean) {
  return value === undefined ? fallback : value === "true"
}

export function getStringSeed(value: string) {
  return Array.from(value).reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0,
    17
  )
}

export function getSsoUser(payload: unknown): AuthUser | null {
  const data = payload as SsoExchangeResponse

  if (
    !data.user ||
    typeof data.user.id !== "string" ||
    typeof data.user.email !== "string"
  ) {
    return null
  }

  return data.user
}

export function resolveToastMessage(
  toastConfig: CallerToastConfig | undefined,
  kind: "loading" | "success" | "error",
  fallback?: string
) {
  if (!toastConfig) {
    return null
  }

  if (toastConfig === true) {
    return fallback ?? null
  }

  return toastConfig[kind] ?? fallback ?? null
}

export function getPayloadMessage(payload: unknown) {
  if (!payload) {
    return null
  }

  if (typeof payload === "string") {
    return payload
  }

  if (typeof payload !== "object") {
    return null
  }

  const data = payload as ApiErrorPayload

  if (Array.isArray(data.errors)) {
    const messages = data.errors
      .map((item) => {
        if (!item || typeof item !== "object" || !("message" in item)) {
          return null
        }

        const message = item.message
        return typeof message === "string" ? message : null
      })
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join(", ")
    }
  }

  if (typeof data.message === "string") {
    return data.message
  }

  if (typeof data.error === "string") {
    return data.error
  }

  return null
}

export function getStatusMessage(status: number | undefined) {
  switch (status) {
    case 401:
      return "Your session has expired"
    case 403:
      return "You do not have permission to perform this action"
    case 404:
      return "Data not found"
    case 500:
      return "Internal server error"
    default:
      return status ? "Error " + status : "Request failed"
  }
}

export function isMutation(
  method: CallerMethod,
  endpointType?: "query" | "mutation"
) {
  return endpointType ? endpointType === "mutation" : method !== "GET"
}

export function isAbsoluteUrl(url: string) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isInternalRoute(url: string) {
  return url.startsWith("/auth/")
}

export function unwrapResponseData<TResponse>(
  payload: unknown,
  unwrapData: boolean
) {
  if (!unwrapData) {
    return payload as TResponse
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: TResponse }).data
  }

  return payload as TResponse
}

export function getEndpointRequest(
  args: string | EndpointFetchArgs
): EndpointFetchArgs {
  return typeof args === "string" ? { url: args, method: "GET" } : args
}

export function getEndpointRequestMethod(
  args: string | EndpointFetchArgs
): CallerMethod {
  return typeof args === "string" ? "GET" : (args.method ?? "GET")
}

export function getEndpointRequestBody(request: EndpointFetchArgs) {
  return request.data ?? request.body
}

export function getStableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(getStableValue)
  }

  if (!value || typeof value !== "object") {
    return value
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = getStableValue((value as Record<string, unknown>)[key])
      return acc
    }, {})
}

export function getEndpointArgKey(arg: unknown) {
  try {
    return JSON.stringify(getStableValue(arg)) ?? "undefined"
  } catch {
    return String(arg)
  }
}

export function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function normalizeRequestRecord(
  record: Record<string, unknown> | undefined,
  mode: "headers"
): Record<string, string> | undefined
export function normalizeRequestRecord(
  record: Record<string, unknown> | undefined,
  mode: "params"
): Record<string, string | number | boolean | null | undefined> | undefined
export function normalizeRequestRecord(
  record: Record<string, unknown> | undefined,
  mode: "headers" | "params"
) {
  if (!record) {
    return undefined
  }

  return Object.entries(record).reduce<
    Record<string, string | number | boolean | null | undefined>
  >((acc, [key, value]) => {
    if (mode === "headers") {
      if (value !== undefined && value !== null) {
        acc[key] = String(value)
      }

      return acc
    }

    if (typeof value === "object" && value !== null) {
      acc[key] = JSON.stringify(value)
    } else if (
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      acc[key] = value
    }

    return acc
  }, {})
}

export function getInitials(value: string, limit = 2) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, limit)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function formatRelativeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"

  const elapsed = Date.now() - date.getTime()
  const minute = 60_000
  const hour = minute * 60
  const day = hour * 24

  if (elapsed < minute) return "Just now"
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m ago`
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`
  if (elapsed < day * 7) return `${Math.floor(elapsed / day)}d ago`

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date)
}

export const authUserStatuses = [
  "active",
  "inactive",
  "suspended",
  "deleted",
] as const

export type AuthUserStatus = (typeof authUserStatuses)[number]

export interface SsoAuthUserClaims extends Record<string, unknown> {
  sub?: string
  email?: string
  name?: string | null
  preferred_username?: string | null
  status?: AuthUserStatus
  picture?: string | null
  user_metadata?: Record<string, unknown>
  gorth_app?: Record<string, unknown>
}

export interface SsoAuthUser {
  id: string
  email: string
  name: string | null
  username: string | null
  image: string | null
  status: AuthUserStatus
}

export interface TimestampedUser {
  lastSeenAt?: Date | null
  syncedAt: Date
  createdAt: Date
  updatedAt: Date
}

export function normalizeUrl(value: string) {
  return new URL(value).toString().replace(/\/$/, "")
}

export function getRecordString(
  record: Record<string, unknown> | undefined,
  key: string
) {
  const value = record?.[key]
  return typeof value === "string" ? value : null
}

export function getAuthUserStatus(value: unknown): AuthUserStatus {
  return authUserStatuses.includes(value as AuthUserStatus)
    ? (value as AuthUserStatus)
    : "active"
}

export function formatSsoAuthUser(
  payload: SsoAuthUserClaims
): SsoAuthUser | null {
  if (!payload.sub || !payload.email) return null

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name ?? getRecordString(payload.user_metadata, "name"),
    username:
      payload.preferred_username ??
      getRecordString(payload.user_metadata, "username"),
    image:
      payload.picture ??
      getRecordString(payload.user_metadata, "avatar_url") ??
      getRecordString(payload.user_metadata, "picture"),
    status: getAuthUserStatus(payload.status),
  }
}

export function getAppClaim(payload: SsoAuthUserClaims, claimName: string) {
  const claim = payload[claimName]

  if (claim && typeof claim === "object") {
    return claim as Record<string, unknown>
  }

  return payload.gorth_app ?? null
}

export function formatUser<T extends TimestampedUser>(user: T) {
  return {
    ...user,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    syncedAt: user.syncedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export function formatPublicSession(record: {
  subject: string
  expiresAt: number
  user: {
    name: string
    email: string
    username: string | null
    image: string | null
  }
}) {
  const { name, email, username, image } = record.user
  return {
    user: { id: record.subject, name, email, username, image },
    expiresAt: record.expiresAt,
  }
}

export function formatAuthUser(user: {
  externalUserId: string
  name: string
  email: string
  username?: string | null
  image?: string | null
}): AuthUser {
  return {
    id: user.externalUserId,
    name: user.name,
    email: user.email,
    username: user.username ?? null,
    image: user.image ?? null,
  }
}

export function formatLocalUser(user: import("@/database/schema").User) {
  return {
    id: user.id,
    externalUserId: user.externalUserId,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    email: user.email,
    image: user.image,
    metadata: user.metadata,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    syncedAt: user.syncedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export function formatResourceComment(
  comment: import("@/utils/interface").ResourceCommentRecord,
  page: { id: string; workspaceId: string },
  authorId?: string
) {
  return {
    id: comment.id,
    workspaceId: page.workspaceId,
    pageId: page.id,
    blockId: null,
    parentCommentId: comment.parentId ?? null,
    authorId: authorId ?? comment.author.id,
    content: comment.content,
    resolvedAt: null,
    editedAt: comment.editedAt ?? null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  }
}
export function formatResourceFavorite(
  save: import("@/utils/interface").ResourceSaveRecord["save"],
  page: { id: string; workspaceId: string },
  userId: string
) {
  const position = save.metadata?.position
  return {
    workspaceId: page.workspaceId,
    userId,
    pageId: page.id,
    position:
      typeof position === "number" && Number.isSafeInteger(position)
        ? position
        : 0,
    createdAt: save.createdAt,
  }
}

const internalApiDomains = new Set(["task", "health"])

const externalApiDomains = new Set([
  "billing",
  "discovery",
  "insight",
  "media",
  "notification",
  "payment",
  "resource",
])

// Canonicalize dynamic same-origin query and mutation paths.
export function formatApiPath(path: string) {
  const domain = /^\/([a-z-]+)(?:[/?#]|$)/.exec(path)?.[1]
  if (!domain) return path
  if (internalApiDomains.has(domain)) return "/internal" + path
  if (externalApiDomains.has(domain)) return "/external" + path
  return path
}
