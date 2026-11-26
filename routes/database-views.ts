import { Hono } from "hono"
import {
  actCreateDatabaseView,
  actDeleteDatabaseView,
  actGetDatabaseView,
  actListDatabaseViews,
  actUpdateDatabaseView,
} from "@/controllers/database-views"
import { requireAuth } from "@/middlewares/auth"
export const databaseViewsRoutes = new Hono()
databaseViewsRoutes.get("/", requireAuth(), actListDatabaseViews)
databaseViewsRoutes.post("/", requireAuth(), actCreateDatabaseView)
databaseViewsRoutes.get("/:id", requireAuth(), actGetDatabaseView)
databaseViewsRoutes.put("/:id", requireAuth(), actUpdateDatabaseView)
databaseViewsRoutes.patch("/:id", requireAuth(), actUpdateDatabaseView)
databaseViewsRoutes.delete("/:id", requireAuth(), actDeleteDatabaseView)
