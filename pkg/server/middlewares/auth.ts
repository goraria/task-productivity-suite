import { sql } from "drizzle-orm"
import { isInsufficientScopeError } from "better-auth/oauth2"

import type { NextFunction, Request, Response } from "@/lib/http"
import { database } from "@/database"
import {
  getSsoUserInfo,
  verifySsoAccessTokenRequest,
} from "@/services/sso"
import {
  accessTokenCookie,
  oauthReadScope,
  oauthWriteScope,
} from "@/utils/environment"
import {
  formatSsoAuthUser,
  getAppClaim,
  type AuthUserStatus,
} from "@/utils/formatter"
import { getUserByExternalId as findUserByExternalId } from "@/services/users"

const gorthAppClaim = "https://gorth.dev/claims/app"
const allowedStatus = "active"
let nextRevokedSessionCleanupAt = 0

export interface AuthUser {
  id: string
  email: string
  name: string | null
  username: string | null
  image: string | null
  status: AuthUserStatus
}

export interface AuthContext {
  authenticated: true
  verifiedBy: "single-sign-on"
  user: AuthUser
  app: Record<string, unknown> | null
  scopes: string[]
  sessionId: string | null
}

export interface RequireAuthOptions {
  freshProfile?: boolean
  requiredScopes?: string[]
}

function getAccessToken(request: Request) {
  const authorization = request.get("authorization")
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim()
  }
  return request.cookies?.[accessTokenCookie] ?? ""
}

async function isRevokedSession(sessionId?: string) {
  if (!sessionId) return false
  const now = Date.now()
  if (now >= nextRevokedSessionCleanupAt) {
    nextRevokedSessionCleanupAt = now + 5 * 60_000
    await database.execute(sql`
      DELETE FROM "revocation" WHERE "expires_at" <= NOW()
    `)
  }
  const result = await database.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM "revocation"
      WHERE "sid" = ${sessionId} AND "expires_at" > NOW()
    ) AS "exists"
  `)
  return Boolean(result.rows[0]?.exists)
}

export function requireAuth(options: RequireAuthOptions = {}) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const accessToken = getAccessToken(request)
    if (!accessToken) {
      return response.status(401).json({ error: "missing_access_token" })
    }

    const requiredScopes =
      options.requiredScopes ??
      (["GET", "HEAD", "OPTIONS"].includes(request.method)
        ? [oauthReadScope]
        : [oauthWriteScope])

    try {
      const claims = await verifySsoAccessTokenRequest(
        request.raw,
        requiredScopes,
        accessToken,
      )
      if (await isRevokedSession(claims.sid)) {
        return response.status(401).json({ error: "revoked_session" })
      }

      // UserInfo is intentionally checked on every protected request. Unlike a
      // self-contained JWT, it detects session revoke, logout and an SSO ban now.
      const userInfo = await getSsoUserInfo(accessToken)
      const remoteUser = formatSsoAuthUser(userInfo)
      const localUser = await findUserByExternalId(claims.sub)

      if (
        !remoteUser ||
        remoteUser.status !== allowedStatus ||
        (localUser && localUser.status !== allowedStatus)
      ) {
        return response.status(403).json({ error: "user_not_active" })
      }

      const user: AuthUser = localUser
        ? {
            id: localUser.externalUserId,
            email: localUser.email,
            name: localUser.name,
            username: localUser.username,
            image: localUser.image,
            status: localUser.status,
          }
        : remoteUser

      response.locals.auth = {
        authenticated: true,
        verifiedBy: "single-sign-on",
        user,
        app:
          getAppClaim(userInfo, gorthAppClaim) ??
          getAppClaim(claims, gorthAppClaim),
        scopes: (claims.scope ?? "").split(" ").filter(Boolean),
        sessionId: claims.sid ?? null,
      } satisfies AuthContext

      return next()
    } catch (error) {
      if (isInsufficientScopeError(error)) {
        const body = error.body ?? {}
        const description =
          typeof body.error_description === "string"
            ? body.error_description
            : undefined
        const scope = typeof body.scope === "string" ? body.scope : undefined
        response.setHeader(
          "WWW-Authenticate",
          `Bearer error="insufficient_scope"${scope ? `, scope="${scope}"` : ""}`,
        )
        return response.status(403).json({
          error: "insufficient_scope",
          ...(description ? { description } : {}),
          ...(scope ? { scope } : {}),
        })
      }
      const message = error instanceof Error ? error.message : "unknown_error"
      if (
        message === "sso_userinfo_failed" ||
        message === "openid_configuration_failed" ||
        message === "invalid_openid_configuration"
      ) {
        console.error("[auth] SSO unavailable", { message })
        return response.status(502).json({ error: "sso_unavailable" })
      }
      console.error("[auth] Access token verification failed", { message })
      return response.status(401).json({ error: "invalid_access_token" })
    }
  }
}
