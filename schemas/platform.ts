import { z } from "@gorth-com/structure/cores/zod"
export const workerGrantSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().min(1).max(600),
})
