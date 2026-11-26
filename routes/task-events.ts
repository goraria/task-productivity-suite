import { actDispatchTaskEvents } from "@/controllers/task-events"
import { requireResourcePolicyDispatcher } from "@/middlewares/resource-policy-dispatch"
import { Hono } from "hono"
export const taskEventsRoutes = new Hono()
taskEventsRoutes.get(
  "/dispatch",
  requireResourcePolicyDispatcher(),
  actDispatchTaskEvents
)
taskEventsRoutes.post(
  "/dispatch",
  requireResourcePolicyDispatcher(),
  actDispatchTaskEvents
)
