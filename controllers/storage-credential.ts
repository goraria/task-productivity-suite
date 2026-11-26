import { storageCredentialRequestSchema } from "@/schemas/storage-credential"
import { rawGetStorageCredential as getStorageCredentialServices } from "@/services/storage-credential"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actGetStorageCredential(context: Context<ApiEnv>) {
  context.header("Cache-Control", "private, no-store")
  context.header("Pragma", "no-cache")
  const input = storageCredentialRequestSchema.parse(await context.req.json())
  return context.json(getStorageCredentialServices(input.bucketName), 200)
}
