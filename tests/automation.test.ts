import { automationSchema } from "@/schemas/automation"
import { matchingAutomations } from "@/utils/automation"
import { expect, it } from "vitest"
const rule = automationSchema.parse({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Triage",
  enabled: true,
  event: "issue.created",
  whenStatus: "backlog",
  action: { kind: "set_status", status: "todo" },
})
it("matches only enabled rules for the selected event and current state", () => {
  expect(
    matchingAutomations(
      [rule],
      "issue.created",
      { status: "backlog", assigneeId: null },
      []
    )
  ).toHaveLength(1)
  expect(
    matchingAutomations(
      [rule],
      "issue.updated",
      { status: "backlog", assigneeId: null },
      []
    )
  ).toHaveLength(0)
  expect(
    matchingAutomations(
      [{ ...rule, enabled: false }],
      "issue.created",
      { status: "backlog", assigneeId: null },
      []
    )
  ).toHaveLength(0)
})
it("does not replay an already applied rule or loop back through the same rule", () => {
  expect(
    matchingAutomations(
      [rule],
      "issue.created",
      { status: "backlog", assigneeId: null },
      [rule.id]
    )
  ).toHaveLength(0)
  expect(
    matchingAutomations(
      [rule],
      "issue.created",
      { status: "todo", assigneeId: null },
      []
    )
  ).toHaveLength(0)
})
it("rejects automation that bypasses workflow transitions", () => {
  expect(
    automationSchema.safeParse({
      ...rule,
      action: { kind: "set_status", status: "done" },
    }).success
  ).toBe(false)
})
