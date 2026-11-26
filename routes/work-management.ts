import * as controllers from "@/controllers/work-management"
import { requireAuth } from "@/middlewares/auth"
import { Hono } from "hono"
export const workManagementRoutes = new Hono()
workManagementRoutes.get("/issue", requireAuth(), controllers.actListIssues)
workManagementRoutes.post("/issue", requireAuth(), controllers.actCreateIssue)
workManagementRoutes.patch("/issue/:id", requireAuth(), controllers.actUpdateIssue)
workManagementRoutes.get(
  "/issue/:id/dependency",
  requireAuth(),
  controllers.actListDependencies
)
workManagementRoutes.delete(
  "/issue/:id/dependency/:dependencyId",
  requireAuth(),
  controllers.actRemoveDependency
)
workManagementRoutes.post(
  "/issue/:id/dependency",
  requireAuth(),
  controllers.actAddDependency
)
workManagementRoutes.get("/sprint", requireAuth(), controllers.actListSprints)
workManagementRoutes.post("/sprint", requireAuth(), controllers.actCreateSprint)
workManagementRoutes.post(
  "/sprint/:id/transition",
  requireAuth(),
  controllers.actTransitionSprint
)
workManagementRoutes.get("/report", requireAuth(), controllers.actWorkReport)
