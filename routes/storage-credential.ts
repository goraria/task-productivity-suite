import { actGetStorageCredential } from "@/controllers/storage-credential"
import { requireMediaStorageClient } from "@/middlewares/storage-credential"
import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
export const storageCredentialRoutes = new Hono()
storageCredentialRoutes.post(
  "/credential",
  bodyLimit({ maxSize: 1024 }),
  requireMediaStorageClient(),
  actGetStorageCredential
)
