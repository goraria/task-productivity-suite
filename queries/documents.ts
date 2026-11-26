"use client"
import { useAuth } from "@/hooks/use-auth"
import { productivityKeys } from "@/queries/productivity"
import {
  createMutationService,
  createQueryService,
  defineMutation,
  defineQuery,
} from "@/utils/caller"
interface Revision {
  id: string
  entityId: string
  entityType: string
  version: number
  createdAt: string
  snapshot: Record<string, unknown>
}
const revisions = createQueryService(
  defineQuery<Revision[], { id: string; offset: number; subject?: string }>({
    queryKey: (input) => [...productivityKeys.resource("revision"), input],
    query: ({ id, offset }) => ({
      url: `/internal/task/document/${id}/revision`,
      method: "GET",
      params: { limit: 20, offset },
    }),
    queryOptions: ({ id, subject }) => ({ enabled: Boolean(id && subject) }),
  })
)
export function useDocumentRevisions(id: string, offset = 0) {
  return revisions({ id, offset, subject: useAuth().account?.id })
}
export const useRestoreRevision = createMutationService(
  defineMutation<unknown, { id: string; revisionId: string; version: number }>({
    query: ({ id, ...body }) => ({
      url: `/internal/task/document/${id}/restore`,
      method: "POST",
      body,
    }),
    invalidates: [
      productivityKeys.resource("page"),
      productivityKeys.resource("block"),
      productivityKeys.resource("revision"),
    ],
  })
)
export const useReorderBlocks = createMutationService(
  defineMutation<unknown, { id: string; ids: string[] }>({
    query: ({ id, ids }) => ({
      url: `/internal/task/document/${id}/reorder`,
      method: "POST",
      body: { ids },
    }),
    invalidates: [productivityKeys.resource("block")],
  })
)
export const useDocumentPublication = createMutationService(
  defineMutation<unknown, { id: string; published: boolean }>({
    query: ({ id, published }) => ({
      url: `/internal/task/document/${id}/publication`,
      method: "POST",
      body: { published },
    }),
    invalidates: [
      productivityKeys.resource("page"),
      productivityKeys.resource("permission"),
    ],
  })
)
export const useImportDocument = createMutationService(
  defineMutation<
    { id: string },
    {
      workspaceId: string
      title: string
      blocks: { type: string; content: Record<string, unknown> }[]
    }
  >({
    query: (body) => ({ url: "/internal/task/document/import", method: "POST", body }),
    invalidates: [
      productivityKeys.resource("page"),
      productivityKeys.resource("block"),
    ],
  })
)
export async function downloadDocument(id: string) {
  // Export is a same-origin document download; no service token enters the browser.
  const response = await fetch(`/internal/task/document/${id}/export`, {
    credentials: "same-origin",
    cache: "no-store",
  })
  if (!response.ok) throw new Error("Document export failed")
  const { data } = await response.json()
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  )
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "document.json"
  anchor.click()
  URL.revokeObjectURL(url)
}
