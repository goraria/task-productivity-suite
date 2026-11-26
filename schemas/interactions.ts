import z from "@gorth-com/structure/cores/zod"
export const pageResourceQuerySchema = z.object({ pageId: z.uuid() })
export const resourceAuthorizationSchema = z.object({
  access: z.enum(["read", "comment"]).default("read"),
})
const pageResourceBody = z.object({ pageId: z.uuid(), workspaceId: z.uuid() })
export const createCommentSchema = pageResourceBody.extend({
  content: z.string().trim().min(1).max(10000),
  parentCommentId: z.uuid().nullable().optional(),
})
export const createFavoriteSchema = pageResourceBody.extend({
  position: z.number().int().min(0).max(1000000).default(0),
})
export type CreateTaskCommentInput = z.infer<typeof createCommentSchema>
export type CreateTaskFavoriteInput = z.infer<typeof createFavoriteSchema>

export const resourceBatchAuthorizationSchema = z.object({
  ids: z
    .string()
    .transform((value) => value.split(","))
    .pipe(z.array(z.uuid()).min(1).max(100)),
})
