import { rawDispatchTaskEvents as dispatchTaskEventsServices } from "@/models/task-event-outbox"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actDispatchTaskEvents(context: Context<ApiEnv>) {
  return context.json(await dispatchTaskEventsServices(), 200)
}
