import { Hono } from "hono"
import {
  actCreateFile,
  actDeleteFile,
  actGetFile,
  actListFiles,
  actUpdateFile,
} from "@/controllers/files"
import { requireAuth } from "@/middlewares/auth"
export const filesRoutes = new Hono()
filesRoutes.get("/", requireAuth(), actListFiles)
filesRoutes.post("/", requireAuth(), actCreateFile)
filesRoutes.get("/:id", requireAuth(), actGetFile)
filesRoutes.put("/:id", requireAuth(), actUpdateFile)
filesRoutes.patch("/:id", requireAuth(), actUpdateFile)
filesRoutes.delete("/:id", requireAuth(), actDeleteFile)
