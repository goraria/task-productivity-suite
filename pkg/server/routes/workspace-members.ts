import { Router } from "@/lib/http"
import {
  createWorkspaceMemberController,
  deleteWorkspaceMemberController,
  getWorkspaceMemberController,
  listWorkspaceMembersController,
  updateWorkspaceMemberController,
} from "@/controllers/workspace-members"
import { requireAuth } from "@/middlewares/auth"
export function workspaceMembersRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listWorkspaceMembersController)
  router.post("/", requireAuth(), createWorkspaceMemberController)
  router.get("/:workspaceId/:userId", requireAuth(), getWorkspaceMemberController)
  router.put("/:workspaceId/:userId", requireAuth(), updateWorkspaceMemberController)
  router.patch("/:workspaceId/:userId", requireAuth(), updateWorkspaceMemberController)
  router.delete("/:workspaceId/:userId", requireAuth(), deleteWorkspaceMemberController)
  return router
}
