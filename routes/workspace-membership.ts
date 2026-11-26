import { actWorkspaceActivity } from "@/controllers/workspace-activity"
import {
  actRetryWorkspaceDelivery,
  actWorkspaceDelivery,
} from "@/controllers/workspace-delivery"
import * as controllers from "@/controllers/workspace-membership"
import { requireAuth } from "@/middlewares/auth"
import { Hono } from "hono"
export const workspaceMembershipRoutes = new Hono()
workspaceMembershipRoutes.get(
  "/invitation",
  requireAuth(),
  controllers.actListWorkspaceInvitations
)
workspaceMembershipRoutes.get(
  "/:id/directory",
  requireAuth(),
  controllers.actWorkspaceDirectory
)
workspaceMembershipRoutes.get("/:id/delivery", requireAuth(), actWorkspaceDelivery)
workspaceMembershipRoutes.post(
  "/:id/delivery/:eventId/retry",
  requireAuth(),
  actRetryWorkspaceDelivery
)
workspaceMembershipRoutes.get("/:id/activity", requireAuth(), actWorkspaceActivity)
workspaceMembershipRoutes.post(
  "/:id/invitation",
  requireAuth(),
  controllers.actInviteWorkspaceMember
)
workspaceMembershipRoutes.post(
  "/:id/accept",
  requireAuth(),
  controllers.actAcceptWorkspaceInvitation
)
workspaceMembershipRoutes.post(
  "/:id/leave",
  requireAuth(),
  controllers.actLeaveWorkspace
)
workspaceMembershipRoutes.post(
  "/:id/transfer",
  requireAuth(),
  controllers.actTransferWorkspace
)
