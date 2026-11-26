import { Router } from "@/lib/http"
import {
  createPageController,
  deletePageController,
  getPageController,
  listPagesController,
  updatePageController,
} from "@/controllers/pages"
import { requireAuth } from "@/middlewares/auth"
export function pagesRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listPagesController)
  router.post("/", requireAuth(), createPageController)
  router.get("/:id", requireAuth(), getPageController)
  router.put("/:id", requireAuth(), updatePageController)
  router.patch("/:id", requireAuth(), updatePageController)
  router.delete("/:id", requireAuth(), deletePageController)
  return router
}
