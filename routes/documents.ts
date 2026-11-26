import * as media from "@/controllers/document-media"
import { actDocumentPresence } from "@/controllers/document-presence"
import * as controllers from "@/controllers/documents"
import { requireAuth } from "@/middlewares/auth"
import { Hono } from "hono"
export const documentsRoutes = new Hono()
documentsRoutes.post("/:id/presence", requireAuth(), actDocumentPresence)
documentsRoutes.post("/import", requireAuth(), controllers.actImportDocument)
documentsRoutes.post("/:id/upload", requireAuth(), media.actCreateDocumentUpload)
documentsRoutes.post(
  "/:id/attachment",
  requireAuth(),
  media.actAttachDocumentAsset
)
documentsRoutes.get(
  "/:id/attachment/:assetId",
  requireAuth(),
  media.actGetDocumentAssetUrl
)
documentsRoutes.get("/:id/export", requireAuth(), controllers.actExportDocument)
documentsRoutes.get(
  "/:id/revision",
  requireAuth(),
  controllers.actListDocumentRevisions
)
documentsRoutes.post(
  "/:id/restore",
  requireAuth(),
  controllers.actRestoreDocumentRevision
)
documentsRoutes.post(
  "/:id/reorder",
  requireAuth(),
  controllers.actReorderDocumentBlocks
)
documentsRoutes.post(
  "/:id/publication",
  requireAuth(),
  controllers.actSetDocumentPublication
)
documentsRoutes.post(
  "/:id/access-mode",
  requireAuth(),
  controllers.actSetDocumentAccessMode
)
