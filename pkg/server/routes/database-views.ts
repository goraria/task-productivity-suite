import { Router } from "@/lib/http"
import {
  createDatabaseViewController,
  deleteDatabaseViewController,
  getDatabaseViewController,
  listDatabaseViewsController,
  updateDatabaseViewController,
} from "@/controllers/database-views"
import { requireAuth } from "@/middlewares/auth"
export function databaseViewsRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listDatabaseViewsController)
  router.post("/", requireAuth(), createDatabaseViewController)
  router.get("/:id", requireAuth(), getDatabaseViewController)
  router.put("/:id", requireAuth(), updateDatabaseViewController)
  router.patch("/:id", requireAuth(), updateDatabaseViewController)
  router.delete("/:id", requireAuth(), deleteDatabaseViewController)
  return router
}
