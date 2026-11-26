import "server-only"
import { after } from "next/server"
import {
  oauthClientId,
  oauthClientSecret,
} from "@/utils/environment"
import { rawDispatchResourcePolicy } from "@/models/resource-policy-outbox"

export function scheduleResourcePolicyDispatch(
  request: Request,
  response: Response
) {
  if (
    !oauthClientId ||
    !oauthClientSecret ||
    response.status < 200 ||
    response.status >= 400
  )
    return
  const path = new URL(request.url).pathname
  const mutation = !["GET", "HEAD", "OPTIONS"].includes(request.method)
  const changed =
    mutation &&
    /^\/internal\/task\/(workspace|workspace-member|permission|page|user)(\/|$)/.test(
      path
    )
  const provisioned = path === "/auth/callback/gorth"
  if (!changed && !provisioned) return
  // Best-effort low-latency delivery, not the durable queue. DB triggers +
  // authenticated periodic dispatch remain authoritative after crashes.
  after(async () => {
    try {
      await rawDispatchResourcePolicy()
    } catch {
      console.error(
        "[task-resource-policy] delivery pending; worker will retry"
      )
    }
  })
}
