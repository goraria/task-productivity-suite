import { z } from "@gorth-com/structure/cores/zod"
export const workspaceIdSchema = z.uuid()
export const workspaceTransferSchema = z.object({ ownerId: z.uuid() })
export const workspaceInvitationSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  role: z.enum(["member", "guest"]).default("member"),
})
