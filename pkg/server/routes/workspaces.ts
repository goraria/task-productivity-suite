import { Router } from "@/lib/http"
import {
  createWorkspaceController,
  deleteWorkspaceController,
  getWorkspaceController,
  listWorkspacesController,
  updateWorkspaceController,
} from "@/controllers/workspaces"
import { requireAuth } from "@/middlewares/auth"
export function workspacesRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listWorkspacesController)
  router.post("/", requireAuth(), createWorkspaceController)
  router.get("/:id", requireAuth(), getWorkspaceController)
  router.put("/:id", requireAuth(), updateWorkspaceController)
  router.patch("/:id", requireAuth(), updateWorkspaceController)
  router.delete("/:id", requireAuth(), deleteWorkspaceController)
  return router
}
