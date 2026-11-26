import { z } from "@gorth-com/structure/cores/zod"
export const storageCredentialRequestSchema = z
  .object({
    bucketName: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,253}[a-z0-9]$/),
  })
  .strict()
export const taskStorageConfigurationSchema = z
  .object({
    endpoint: z.url().refine((value) => {
      try {
        const url = new URL(value)
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          url.pathname === "/"
        )
      } catch {
        return false
      }
    }),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
    region: z.string().min(1),
    bucketName: z.string().min(3),
  })
  .strict()
