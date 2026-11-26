import { Hono } from "hono"
import { requireResourcePolicyDispatcher } from "@/middlewares/resource-policy-dispatch"
import { actDispatchResourcePolicy } from "@/controllers/resource-policy-sync"

export const resourcePolicySyncRoutes = new Hono()
resourcePolicySyncRoutes.get(
  "/dispatch",
  requireResourcePolicyDispatcher(),
  actDispatchResourcePolicy
)
resourcePolicySyncRoutes.post(
  "/dispatch",
  requireResourcePolicyDispatcher(),
  actDispatchResourcePolicy
)
