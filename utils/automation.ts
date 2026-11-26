import type { Automation } from "@/schemas/automation"
import { canTransition } from "@/schemas/work-management"
export function matchingAutomations(
  rules: Automation[],
  event: string,
  issue: { status: string; assigneeId: string | null },
  trail: string[]
) {
  return rules.filter(
    (rule) =>
      rule.enabled &&
      rule.event === event &&
      !trail.includes(rule.id) &&
      (!rule.whenStatus || rule.whenStatus === issue.status) &&
      (rule.action.kind === "assign"
        ? issue.assigneeId !== rule.action.userId
        : issue.status !== rule.action.status &&
          canTransition(issue.status, rule.action.status))
  )
}
