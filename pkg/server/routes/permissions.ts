import { Router } from "@/lib/http"
import {
  createPermissionController,
  deletePermissionController,
  getPermissionController,
  listPermissionsController,
  updatePermissionController,
} from "@/controllers/permissions"
import { requireAuth } from "@/middlewares/auth"
export function permissionsRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listPermissionsController)
  router.post("/", requireAuth(), createPermissionController)
  router.get("/:id", requireAuth(), getPermissionController)
  router.put("/:id", requireAuth(), updatePermissionController)
  router.patch("/:id", requireAuth(), updatePermissionController)
  router.delete("/:id", requireAuth(), deletePermissionController)
  return router
}
