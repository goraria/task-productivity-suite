import { Hono } from "hono"
import {
  actCreatePermission,
  actDeletePermission,
  actGetPermission,
  actListPermissions,
  actUpdatePermission,
} from "@/controllers/permissions"
import { requireAuth } from "@/middlewares/auth"
export const permissionsRoutes = new Hono()
permissionsRoutes.get("/", requireAuth(), actListPermissions)
permissionsRoutes.post(
  "/",
  requireAuth({ freshProfile: true }),
  actCreatePermission
)
permissionsRoutes.get("/:id", requireAuth(), actGetPermission)
permissionsRoutes.put(
  "/:id",
  requireAuth({ freshProfile: true }),
  actUpdatePermission
)
permissionsRoutes.patch(
  "/:id",
  requireAuth({ freshProfile: true }),
  actUpdatePermission
)
permissionsRoutes.delete(
  "/:id",
  requireAuth({ freshProfile: true }),
  actDeletePermission
)
