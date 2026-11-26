import { Hono } from "hono"
import { actGetCurrentUser, actGetUser, actListUsers } from "@/controllers/users"
import { requireAuth } from "@/middlewares/auth"

// User provisioning and identity changes belong to the verified OAuth lifecycle.
// Domain APIs never bypass Better Auth by accepting an arbitrary SSO subject.
export const usersRoutes = new Hono()
usersRoutes.get("/", requireAuth(), actListUsers)
usersRoutes.get("/me", requireAuth(), actGetCurrentUser)
usersRoutes.get("/:id", requireAuth(), actGetUser)
