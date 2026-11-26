import { Router } from "@/lib/http"
import {
  createBlockController,
  deleteBlockController,
  getBlockController,
  listBlocksController,
  updateBlockController,
} from "@/controllers/blocks"
import { requireAuth } from "@/middlewares/auth"
export function blocksRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listBlocksController)
  router.post("/", requireAuth(), createBlockController)
  router.get("/:id", requireAuth(), getBlockController)
  router.put("/:id", requireAuth(), updateBlockController)
  router.patch("/:id", requireAuth(), updateBlockController)
  router.delete("/:id", requireAuth(), deleteBlockController)
  return router
}
