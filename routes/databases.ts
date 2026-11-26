import { actListDatabaseRecords } from "@/controllers/database-records"
import {
  actCreateDatabase,
  actDeleteDatabase,
  actGetDatabase,
  actListDatabases,
  actUpdateDatabase,
} from "@/controllers/databases"
import { requireAuth } from "@/middlewares/auth"
import { Hono } from "hono"
export const databasesRoutes = new Hono()
databasesRoutes.get("/:id/record", requireAuth(), actListDatabaseRecords)
databasesRoutes.get("/", requireAuth(), actListDatabases)
databasesRoutes.post("/", requireAuth(), actCreateDatabase)
databasesRoutes.get("/:id", requireAuth(), actGetDatabase)
databasesRoutes.put("/:id", requireAuth(), actUpdateDatabase)
databasesRoutes.patch("/:id", requireAuth(), actUpdateDatabase)
databasesRoutes.delete("/:id", requireAuth(), actDeleteDatabase)
