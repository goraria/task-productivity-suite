import { Router } from "@/lib/http"
import {
  createPagePropertyValueController,
  deletePagePropertyValueController,
  getPagePropertyValueController,
  listPagePropertyValuesController,
  updatePagePropertyValueController,
} from "@/controllers/page-property-values"
import { requireAuth } from "@/middlewares/auth"
export function pagePropertyValuesRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listPagePropertyValuesController)
  router.post("/", requireAuth(), createPagePropertyValueController)
  router.get("/:pageId/:propertyId", requireAuth(), getPagePropertyValueController)
  router.put("/:pageId/:propertyId", requireAuth(), updatePagePropertyValueController)
  router.patch("/:pageId/:propertyId", requireAuth(), updatePagePropertyValueController)
  router.delete("/:pageId/:propertyId", requireAuth(), deletePagePropertyValueController)
  return router
}
