import { Hono } from "hono"
import {
  actCreatePagePropertyValue,
  actDeletePagePropertyValue,
  actGetPagePropertyValue,
  actListPagePropertyValues,
  actUpdatePagePropertyValue,
} from "@/controllers/page-property-values"
import { requireAuth } from "@/middlewares/auth"
export const pagePropertyValuesRoutes = new Hono()
pagePropertyValuesRoutes.get("/", requireAuth(), actListPagePropertyValues)
pagePropertyValuesRoutes.post("/", requireAuth(), actCreatePagePropertyValue)
pagePropertyValuesRoutes.get(
  "/:pageId/:propertyId",
  requireAuth(),
  actGetPagePropertyValue
)
pagePropertyValuesRoutes.put(
  "/:pageId/:propertyId",
  requireAuth(),
  actUpdatePagePropertyValue
)
pagePropertyValuesRoutes.patch(
  "/:pageId/:propertyId",
  requireAuth(),
  actUpdatePagePropertyValue
)
pagePropertyValuesRoutes.delete(
  "/:pageId/:propertyId",
  requireAuth(),
  actDeletePagePropertyValue
)
