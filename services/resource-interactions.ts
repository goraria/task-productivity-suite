import "server-only"
import { inArray } from "drizzle-orm"
import { getDatabase } from "@/database"
import { CrudError, type CrudActor } from "@/database/crud"
import { userTable } from "@/database/schema"
import { rawListReadableResourcePages } from "@/models/page"
import { rawGetAuthorizedResourcePage } from "@/services/resource-policy"
import { oauthResourceAudience } from "@/utils/environment"
import { fetcher, type FetcherOptions } from "@/utils/fetcher"
import {
  formatResourceComment,
  formatResourceFavorite,
} from "@/utils/formatter"
import type {
  ResourceCommentRecord,
  ResourceSaveRecord,
} from "@/utils/interface"
import type {
  CreateTaskCommentInput,
  CreateTaskFavoriteInput,
} from "@/schemas/interactions"

async function resourceRequest<T>(
  accessToken: string,
  path: string,
  method: FetcherOptions["method"] = "GET",
  body?: unknown,
  params?: Record<string, string | number>
) {
  if (!oauthResourceAudience)
    throw new CrudError(
      503,
      "resource_unavailable",
      "Resource is not configured"
    )
  try {
    const response = await fetcher<T>({
      url: new URL(path, oauthResourceAudience),
      method,
      body,
      params,
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "manual",
      timeout: 10000,
      validateStatus: () => true,
    })
    if (response.status < 200 || response.status >= 300)
      throw new CrudError(
        response.status >= 500 ? 503 : response.status,
        "resource_request_failed",
        "Resource request failed"
      )
    return response.data
  } catch (error) {
    if (error instanceof CrudError) throw error
    throw new CrudError(
      503,
      "resource_unavailable",
      "Cannot connect to Resource"
    )
  }
}
export async function rawListPageComments(
  actor: CrudActor,
  token: string,
  pageId: string
) {
  const page = await rawGetAuthorizedResourcePage(actor, pageId)
  const result = await resourceRequest<{
    data: ResourceCommentRecord[]
    pagination: unknown
  }>(token, "/resource/comment/page", "GET", undefined, {
    id: pageId,
    limit: 100,
    offset: 0,
  })
  const subjects = [...new Set(result.data.map((c) => c.author.id))]
  const users = subjects.length
    ? await getDatabase()
        .select({ id: userTable.id, externalUserId: userTable.externalUserId })
        .from(userTable)
        .where(inArray(userTable.externalUserId, subjects))
    : []
  return {
    data: result.data.map((c) =>
      formatResourceComment(
        c,
        page,
        users.find((u) => u.externalUserId === c.author.id)?.id
      )
    ),
    pagination: result.pagination,
  }
}
export async function rawCreatePageComment(
  actor: CrudActor,
  token: string,
  input: CreateTaskCommentInput
) {
  const page = await rawGetAuthorizedResourcePage(actor, input.pageId, "comment")
  if (page.workspaceId !== input.workspaceId)
    throw new CrudError(
      403,
      "workspace_mismatch",
      "Workspace does not match the page"
    )
  const comment = await resourceRequest<ResourceCommentRecord>(
    token,
    "/resource/comment/page",
    "POST",
    { content: input.content, parentId: input.parentCommentId ?? null },
    { id: input.pageId }
  )
  return formatResourceComment(comment, page, actor.userId)
}
export async function rawDeletePageComment(
  actor: CrudActor,
  token: string,
  pageId: string,
  commentId: string
) {
  await rawGetAuthorizedResourcePage(actor, pageId, "comment")
  await resourceRequest(token, "/resource/comment/page", "DELETE", undefined, {
    id: pageId,
    comment: commentId,
  })
  return { id: commentId }
}
export async function rawListFavorites(actor: CrudActor, token: string) {
  const saves = await resourceRequest<ResourceSaveRecord[]>(
    token,
    "/resource/me/bookmark",
    "GET",
    undefined,
    { type: "favorite", resourceType: "page", limit: 100, offset: 0 }
  )
  const valid = saves.filter(
    (s) =>
      s.resource.application === "task" && s.resource.resourceType === "page"
  )
  const pages = await rawListReadableResourcePages(
    actor,
    valid.map((s) => s.resource.resourceId)
  )
  return {
    data: valid.flatMap((save) => {
      const page = pages.find((p) => p.id === save.resource.resourceId)
      return page ? [formatResourceFavorite(save.save, page, actor.userId)] : []
    }),
    pagination: { limit: 100, offset: 0 },
  }
}
export async function rawCreateFavorite(
  actor: CrudActor,
  token: string,
  input: CreateTaskFavoriteInput
) {
  const page = await rawGetAuthorizedResourcePage(actor, input.pageId)
  if (page.workspaceId !== input.workspaceId)
    throw new CrudError(
      403,
      "workspace_mismatch",
      "Workspace does not match the page"
    )
  const save = await resourceRequest<ResourceSaveRecord["save"]>(
    token,
    "/resource/bookmark/page",
    "PUT",
    { metadata: { position: input.position } },
    { id: input.pageId, list: "favorite" }
  )
  return formatResourceFavorite(save, page, actor.userId)
}
export async function rawDeleteFavorite(
  actor: CrudActor,
  token: string,
  userId: string,
  pageId: string
) {
  if (userId !== actor.userId)
    throw new CrudError(
      403,
      "forbidden",
      "Cannot change another user's favorites"
    )
  await rawGetAuthorizedResourcePage(actor, pageId)
  await resourceRequest(token, "/resource/bookmark/page", "DELETE", undefined, {
    id: pageId,
    list: "favorite",
  })
  return { userId: actor.userId, pageId }
}
