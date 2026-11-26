import { Hono } from "hono"
import {
  actCreateWorkspace,
  actDeleteWorkspace,
  actGetWorkspace,
  actListWorkspaces,
  actUpdateWorkspace,
} from "@/controllers/workspaces"
import { requireAuth } from "@/middlewares/auth"
export const workspacesRoutes = new Hono()
workspacesRoutes.get("/", requireAuth(), actListWorkspaces)
workspacesRoutes.post("/", requireAuth(), actCreateWorkspace)
workspacesRoutes.get("/:id", requireAuth(), actGetWorkspace)
workspacesRoutes.put("/:id", requireAuth(), actUpdateWorkspace)
workspacesRoutes.patch("/:id", requireAuth(), actUpdateWorkspace)
workspacesRoutes.delete("/:id", requireAuth(), actDeleteWorkspace)
