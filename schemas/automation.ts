import { canTransition, issueStatuses } from "@/schemas/work-management"
import { z } from "@gorth-com/structure/cores/zod"
export const automationSchema = z
  .object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(160),
    enabled: z.boolean().default(true),
    event: z.enum(["issue.created", "issue.updated"]),
    whenStatus: z.enum(issueStatuses).optional(),
    action: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("set_status"),
        status: z.enum(issueStatuses),
      }),
      z.object({ kind: z.literal("assign"), userId: z.uuid() }),
    ]),
  })
  .refine(
    (rule) =>
      !rule.whenStatus ||
      rule.action.kind !== "set_status" ||
      canTransition(rule.whenStatus, rule.action.status),
    "Automation must follow the issue workflow"
  )
export const workspaceSettingsSchema = z
  .object({
    allowGuests: z.boolean().optional(),
    automations: z.array(automationSchema).max(20).optional(),
  })
  .passthrough()
export type Automation = z.infer<typeof automationSchema>
