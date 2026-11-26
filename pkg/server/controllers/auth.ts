import type { NextFunction, Request, Response } from "@/lib/http"
import type { AuthContext } from "@/middlewares/auth"
import { syncUser as syncUserService } from "@/services/users"

export async function syncUser(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  const auth = response.locals.auth as AuthContext | undefined

  if (!auth?.user) {
    return response.status(401).json({ error: "unauthorized" })
  }

  try {
    const user = await syncUserService({
      externalUserId: auth.user.id,
      name: auth.user.name ?? auth.user.email.split("@")[0] ?? auth.user.email,
      username: auth.user.username,
      email: auth.user.email,
      image: auth.user.image,
      status: auth.user.status,
    })
    return response.status(200).json({ data: user })
  } catch (error) {
    return next(error)
  }
}

export function splat(_request: Request, response: Response) {
  return response.status(404).json({ error: "sso_owned_auth_route" })
}
