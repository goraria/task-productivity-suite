import { Hono } from "hono"
import {
  actCreateBlock,
  actDeleteBlock,
  actGetBlock,
  actListBlocks,
  actUpdateBlock,
} from "@/controllers/blocks"
import { requireAuth } from "@/middlewares/auth"
export const blocksRoutes = new Hono()
blocksRoutes.get("/", requireAuth(), actListBlocks)
blocksRoutes.post("/", requireAuth(), actCreateBlock)
blocksRoutes.get("/:id", requireAuth(), actGetBlock)
blocksRoutes.put("/:id", requireAuth(), actUpdateBlock)
blocksRoutes.patch("/:id", requireAuth(), actUpdateBlock)
blocksRoutes.delete("/:id", requireAuth(), actDeleteBlock)
