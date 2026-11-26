import type { NextFunction, Request, Response } from "@/lib/http"
import type { AuthContext } from "@/middlewares/auth"
import { CrudError, getDatabaseError, type CrudActor } from "@/database/crud"
import { getUserByExternalId } from "@/services/users"

export function parsePagination(value: unknown, field: "limit" | "offset") {
  if (value === undefined) return undefined
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new CrudError(
      400,
      "invalid_pagination",
      `${field} must be an integer`
    )
  }
  return Number.parseInt(value, 10)
}

export function normalizeParams(params: Request["params"]) {
  return Object.fromEntries(
    Object.entries(params).map(([name, value]) => [
      name,
      Array.isArray(value) ? value[0] : value,
    ])
  ) as Record<string, string | undefined>
}

export async function resolveActor(response: Response): Promise<CrudActor> {
  try {
    const auth = response.locals.auth as AuthContext | undefined
    if (!auth?.user)
      throw new CrudError(401, "unauthorized", "Authentication is required")
    const user = await getUserByExternalId(auth.user.id)
    if (!user)
      throw new CrudError(
        409,
        "task_user_not_synced",
        "Call POST /auth/sync-user before using task APIs"
      )
    const role = auth.app?.role
    const roles = auth.app?.roles
    const permissions = auth.app?.permissions
    return {
      userId: user.id,
      isAdmin:
        role === "admin" ||
        (Array.isArray(roles) && roles.includes("admin")) ||
        (Array.isArray(permissions) && permissions.includes("admin")),
    }
  } catch (error) {
    throw error
  }
}

export function sendControllerError(
  error: unknown,
  response: Response,
  next: NextFunction
) {
  if (error instanceof CrudError)
    return response
      .status(error.status)
      .json({ error: error.code, message: error.message })
  const code = getDatabaseError(error)
  if (code === "23505")
    return response.status(409).json({ error: "resource_conflict" })
  if (code === "23503")
    return response.status(409).json({ error: "foreign_key_conflict" })
  if (["23502", "23514", "22P02", "22P03"].includes(code))
    return response.status(400).json({ error: "invalid_resource_data" })
  return next(error)
}
