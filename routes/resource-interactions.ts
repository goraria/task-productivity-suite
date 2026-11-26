import { Hono } from "hono"
import { requireAuth } from "@/middlewares/auth"
import {
  actAuthorizePageResource,
  actAuthorizePageResources,
  actCreatePageComment,
  actDeletePageComment,
  actListPageComments,
  actListFavorites,
  actCreateFavorite,
  actDeleteFavorite,
} from "@/controllers/resource-interactions"

export const resourceInteractionRoutes = new Hono()
resourceInteractionRoutes.get(
  "/resource/page/authorize",
  requireAuth(),
  actAuthorizePageResources
)
resourceInteractionRoutes.get(
  "/resource/page/:pageId/authorize",
  requireAuth({ requiredScopes: [] }),
  actAuthorizePageResource
)
resourceInteractionRoutes.get("/comment", requireAuth(), actListPageComments)
resourceInteractionRoutes.post("/comment", requireAuth(), actCreatePageComment)
resourceInteractionRoutes.delete(
  "/comment/:id",
  requireAuth(),
  actDeletePageComment
)
resourceInteractionRoutes.get("/favorite", requireAuth(), actListFavorites)
resourceInteractionRoutes.post("/favorite", requireAuth(), actCreateFavorite)
resourceInteractionRoutes.delete(
  "/favorite/:userId/:pageId",
  requireAuth(),
  actDeleteFavorite
)
