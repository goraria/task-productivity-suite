import { Hono } from "hono"
import {
  actCreatePage,
  actDeletePage,
  actGetPage,
  actListPages,
  actUpdatePage,
} from "@/controllers/pages"
import { requireAuth } from "@/middlewares/auth"
export const pagesRoutes = new Hono()
pagesRoutes.get("/", requireAuth(), actListPages)
pagesRoutes.post("/", requireAuth(), actCreatePage)
pagesRoutes.get("/:id", requireAuth(), actGetPage)
pagesRoutes.put("/:id", requireAuth(), actUpdatePage)
pagesRoutes.patch("/:id", requireAuth(), actUpdatePage)
pagesRoutes.delete("/:id", requireAuth(), actDeletePage)
