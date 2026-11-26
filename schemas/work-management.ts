import { z } from "@gorth-com/structure/cores/zod"
export const issueStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
] as const
export const issueSchema = z.object({
  workspaceId: z.uuid(),
  title: z.string().trim().min(1).max(1000),
  kind: z.enum(["task", "bug", "story", "epic"]).default("task"),
  status: z.enum(issueStatuses).default("backlog"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigneeId: z.uuid().nullable().optional(),
  sprintId: z.uuid().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  estimate: z.number().int().min(0).max(10000).nullable().optional(),
})
export const issueUpdateSchema = issueSchema
  .omit({ workspaceId: true, title: true })
  .partial()
  .extend({ version: z.number().int().positive() })
export const sprintSchema = z
  .object({
    workspaceId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    goal: z.string().max(5000).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine(
    (value) =>
      !value.startsAt || !value.endsAt || value.endsAt > value.startsAt,
    "Sprint end must follow start"
  )
export const sprintActionSchema = z.object({
  action: z.enum(["start", "complete"]),
})
export const dependencySchema = z.object({ dependsOnId: z.uuid() })
export type IssueInput = z.infer<typeof issueSchema>
export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>
export type SprintInput = z.infer<typeof sprintSchema>

const transitions: Record<string, readonly string[]> = {
  backlog: ["todo", "cancelled"],
  todo: ["backlog", "in_progress", "cancelled"],
  in_progress: ["todo", "review", "cancelled"],
  review: ["in_progress", "done", "cancelled"],
  done: ["todo"],
  cancelled: ["backlog"],
}
export function canTransition(from: string, to: string) {
  return from === to || Boolean(transitions[from]?.includes(to))
}
