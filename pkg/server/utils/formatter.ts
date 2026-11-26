import { AuthProvider } from "@/lib/interfaces"
export { formatCodeDate, formatDate } from "@/utils/temp"

export function stringifyQuery(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(String(value)))
    .join("&")
}

export function mapProvider(provider?: string): AuthProvider | null {
  if (!provider) {
    return null
  }

  const value = provider.toLowerCase()
  if (value.includes("google")) return AuthProvider.google
  if (value.includes("facebook")) return AuthProvider.facebook
  if (value.includes("microsoft") || value === "azure") return AuthProvider.microsoft
  if (value.includes("apple")) return AuthProvider.apple
  if (value === "email") return AuthProvider.email
  if (value === "phone") return AuthProvider.phone
  return null
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export const authUserStatuses = [
  "active",
  "inactive",
  "suspended",
  "deleted",
] as const

export type AuthUserStatus = (typeof authUserStatuses)[number]

export interface ParsedJwt<THeader, TClaims> {
  headerValue: string
  payloadValue: string
  signatureValue: string
  header: THeader
  claims: TClaims
}

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

export function urlsMatch(left: string | undefined, right: string) {
  if (!left) return false

  try {
    return normalizeUrl(left) === right
  } catch {
    return false
  }
}

export function decodeJwtPart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T
}

export function parseJwt<THeader, TClaims>(
  token: string
): ParsedJwt<THeader, TClaims> {
  const [headerValue, payloadValue, signatureValue] = token.split(".")

  if (!headerValue || !payloadValue || !signatureValue) {
    throw new Error("invalid_access_token")
  }

  try {
    return {
      headerValue,
      payloadValue,
      signatureValue,
      header: decodeJwtPart<THeader>(headerValue),
      claims: decodeJwtPart<TClaims>(payloadValue),
    }
  } catch {
    throw new Error("invalid_access_token")
  }
}

export function hasAudience(
  audience: string | string[] | undefined,
  expected: string
) {
  return Array.isArray(audience)
    ? audience.includes(expected)
    : audience === expected
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

export function getAppClaim(
  payload: SsoAuthUserClaims,
  claimName: string
) {
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
