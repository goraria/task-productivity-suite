import type { Context } from "hono"
import { rawDispatchResourcePolicy as dispatchResourcePolicyServices } from "@/models/resource-policy-outbox"
import type { ApiEnv } from "@/utils/interface"

export async function actDispatchResourcePolicy(context: Context<ApiEnv>) {
  return context.json(await dispatchResourcePolicyServices(), 200)
}
