import "server-only"
import { QueueClient, registerDevConsumer } from "@vercel/queue"
import { nodeEnv } from "@/utils/environment"

const topic = "task-outbox"
const queue = new QueueClient({ telemetry: { isEnabled: false } })
export async function rawProcessBackgroundJob(message: unknown) {
  if (!message || typeof message !== "object" ||
      (message as { kind?: unknown }).kind !== "drain") throw new Error("Invalid background job")
  const { rawDispatchTaskEvents: dispatchTaskEvents } = await import("@/models/task-event-outbox")
  const { rawDispatchResourcePolicy: dispatchResourcePolicy } = await import("@/models/resource-policy-outbox")
  await dispatchResourcePolicy()
  for (let batch = 0; batch < 10; batch++) {
    const result = await dispatchTaskEvents()
    if ("failed" in result && result.failed) throw new Error("Background delivery deferred")
    if (!result.claimed) return
  }
  await rawEnqueueBackgroundJob()
}
let registered = false
export async function rawEnqueueBackgroundJob() {
  if (nodeEnv === "development" && !registered) {
    registerDevConsumer({ client: queue, topic, consumerGroup: "task-delivery", handler: rawProcessBackgroundJob })
    registered = true
  }
  await queue.send(topic, { kind: "drain" })
}
export const rawBackgroundCallback = queue.handleCallback(rawProcessBackgroundJob)
