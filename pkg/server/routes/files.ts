import { Router } from "@/lib/http"
import {
  createFileController,
  deleteFileController,
  getFileController,
  listFilesController,
  updateFileController,
} from "@/controllers/files"
import { requireAuth } from "@/middlewares/auth"
export function filesRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listFilesController)
  router.post("/", requireAuth(), createFileController)
  router.get("/:id", requireAuth(), getFileController)
  router.put("/:id", requireAuth(), updateFileController)
  router.patch("/:id", requireAuth(), updateFileController)
  router.delete("/:id", requireAuth(), deleteFileController)
  return router
}
