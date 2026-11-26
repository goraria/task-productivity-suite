import { Hono } from "hono"
import {
  actCreateDatabaseProperty,
  actDeleteDatabaseProperty,
  actGetDatabaseProperty,
  actListDatabaseProperties,
  actUpdateDatabaseProperty,
} from "@/controllers/database-properties"
import { requireAuth } from "@/middlewares/auth"
export const databasePropertiesRoutes = new Hono()
databasePropertiesRoutes.get("/", requireAuth(), actListDatabaseProperties)
databasePropertiesRoutes.post("/", requireAuth(), actCreateDatabaseProperty)
databasePropertiesRoutes.get("/:id", requireAuth(), actGetDatabaseProperty)
databasePropertiesRoutes.put("/:id", requireAuth(), actUpdateDatabaseProperty)
databasePropertiesRoutes.patch("/:id", requireAuth(), actUpdateDatabaseProperty)
databasePropertiesRoutes.delete("/:id", requireAuth(), actDeleteDatabaseProperty)
