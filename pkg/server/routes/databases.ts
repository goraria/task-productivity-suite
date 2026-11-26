import { Router } from "@/lib/http"
import {
  createDatabaseController,
  deleteDatabaseController,
  getDatabaseController,
  listDatabasesController,
  updateDatabaseController,
} from "@/controllers/databases"
import { requireAuth } from "@/middlewares/auth"
export function databasesRoutes() {
  const router = Router()
  router.get("/", requireAuth(), listDatabasesController)
  router.post("/", requireAuth(), createDatabaseController)
  router.get("/:id", requireAuth(), getDatabaseController)
  router.put("/:id", requireAuth(), updateDatabaseController)
  router.patch("/:id", requireAuth(), updateDatabaseController)
  router.delete("/:id", requireAuth(), deleteDatabaseController)
  return router
}
