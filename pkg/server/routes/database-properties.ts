import { Router } from "@/lib/http"
import {
  createDatabasePropertyController,
  deleteDatabasePropertyController,
  getDatabasePropertyController,
  listDatabasePropertiesController,
  updateDatabasePropertyController,
} from "@/controllers/database-properties"
import { requireAuth } from "@/middlewares/auth"
export function databasePropertiesRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listDatabasePropertiesController)
  router.post("/", requireAuth(), createDatabasePropertyController)
  router.get("/:id", requireAuth(), getDatabasePropertyController)
  router.put("/:id", requireAuth(), updateDatabasePropertyController)
  router.patch("/:id", requireAuth(), updateDatabasePropertyController)
  router.delete("/:id", requireAuth(), deleteDatabasePropertyController)
  return router
}
