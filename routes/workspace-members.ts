import { Hono } from "hono"
import {
  actCreateWorkspaceMember,
  actDeleteWorkspaceMember,
  actGetWorkspaceMember,
  actListWorkspaceMembers,
  actUpdateWorkspaceMember,
} from "@/controllers/workspace-members"
import { requireAuth } from "@/middlewares/auth"
export const workspaceMembersRoutes = new Hono()
workspaceMembersRoutes.get("/", requireAuth(), actListWorkspaceMembers)
workspaceMembersRoutes.post(
  "/",
  requireAuth({ freshProfile: true }),
  actCreateWorkspaceMember
)
workspaceMembersRoutes.get(
  "/:workspaceId/:userId",
  requireAuth(),
  actGetWorkspaceMember
)
workspaceMembersRoutes.put(
  "/:workspaceId/:userId",
  requireAuth({ freshProfile: true }),
  actUpdateWorkspaceMember
)
workspaceMembersRoutes.patch(
  "/:workspaceId/:userId",
  requireAuth({ freshProfile: true }),
  actUpdateWorkspaceMember
)
workspaceMembersRoutes.delete(
  "/:workspaceId/:userId",
  requireAuth({ freshProfile: true }),
  actDeleteWorkspaceMember
)
