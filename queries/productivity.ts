"use client"
import { useAuth } from "@/hooks/use-auth"

import type {
  ApiListResponse,
  Block,
  Comment,
  Database,
  DatabaseProperty,
  DatabaseView,
  Favorite,
  FileAsset,
  Page,
  PagePropertyValue,
  Permission,
  User,
  Workspace,
  WorkspaceMember,
} from "@/lib/productivity"
import {
  createMutationService,
  createQueryService,
  defineMutation,
  defineQuery,
} from "@/utils/caller"

export interface QueryScope {
  enabled?: boolean
  workspaceId?: string
  pageId?: string
  databaseId?: string
  isArchived?: boolean
  search?: string
  sort?: string
  direction?: "asc" | "desc"
  filterPropertyId?: string
  filterValue?: string
  sortPropertyId?: string
  limit?: number
  offset?: number
  subject?: string
}
function useQueryScope() {
  return { subject: useAuth().account?.id }
}
export const productivityKeys = {
  all: ["productivity"] as const,
  resource: (resource: string) => ["productivity", resource] as const,
  item: (resource: string, id: string) =>
    ["productivity", resource, id] as const,
}

interface UpdateResourceInput<TBody> {
  id: string
  body: TBody
}

interface CompositeResourceInput<TBody = never> {
  firstId: string
  secondId: string
  body?: TBody
}

function createListHook<TData>(resource: string) {
  return createQueryService(
    defineQuery<ApiListResponse<TData>, QueryScope>({
      queryKey: (scope) => [...productivityKeys.resource(resource), scope],
      query: (scope) => ({
        baseURL: null,
        url: `/internal/task/${resource}`,
        method: "GET",
        params: {
          limit: 100,
          offset: 0,
          ...Object.fromEntries(
            Object.entries(scope).filter(
              ([key]) => key !== "subject" && key !== "enabled"
            )
          ),
        },
        unwrapData: false,
      }),
      queryOptions: ({ subject, enabled }) => ({
        enabled: Boolean(subject) && enabled !== false,
      }),
    })
  )
}

function createItemHook<TData>(resource: string) {
  return createQueryService(
    defineQuery<TData, QueryScope & { id: string }>({
      queryKey: ({ id, subject }) => [
        ...productivityKeys.item(resource, id),
        subject,
      ],
      query: ({ id }) => ({
        baseURL: null,
        url: `/internal/task/${resource}/${id}`,
        method: "GET",
      }),
      queryOptions: ({ id, subject }) => ({ enabled: Boolean(id && subject) }),
    })
  )
}

function createCreateHook<TData, TBody>(resource: string) {
  return createMutationService(
    defineMutation<TData, TBody>({
      query: (body) => ({
        baseURL: null,
        url: `/internal/task/${resource}`,
        method: "POST",
        body,
      }),
      invalidates: [
        productivityKeys.resource(resource),
        ...(["database-property", "page-property-value", "permission"].includes(
          resource
        )
          ? [productivityKeys.resource("page")]
          : []),
      ],
    })
  )
}

function createUpdateHook<TData, TBody>(resource: string) {
  return createMutationService(
    defineMutation<TData, UpdateResourceInput<TBody>>({
      query: ({ id, body }) => ({
        baseURL: null,
        url: `/internal/task/${resource}/${id}`,
        method: "PATCH",
        body,
      }),
      invalidates: [
        productivityKeys.resource(resource),
        ...(["database-property", "page-property-value", "permission"].includes(
          resource
        )
          ? [productivityKeys.resource("page")]
          : []),
      ],
    })
  )
}

function createDeleteHook<TData>(resource: string) {
  return createMutationService(
    defineMutation<TData, string>({
      query: (id) => ({
        baseURL: null,
        url: `/internal/task/${resource}/${id}`,
        method: "DELETE",
      }),
      invalidates: [
        productivityKeys.resource(resource),
        ...(["database-property", "page-property-value", "permission"].includes(
          resource
        )
          ? [productivityKeys.resource("page")]
          : []),
      ],
    })
  )
}

const usersListHook = createListHook<User>("user")
const workspacesListHook = createListHook<Workspace>("workspace")
const workspaceMembersListHook =
  createListHook<WorkspaceMember>("workspace-member")
const pagesListHook = createListHook<Page>("page")
const blocksListHook = createListHook<Block>("block")
const databasesListHook = createListHook<Database>("database")
const databasePropertiesListHook =
  createListHook<DatabaseProperty>("database-property")
const pagePropertyValuesListHook = createListHook<PagePropertyValue>(
  "page-property-value"
)
const databaseViewsListHook = createListHook<DatabaseView>("database-view")
const permissionsListHook = createListHook<Permission>("permission")
const commentsListHook = createQueryService(
  defineQuery<ApiListResponse<Comment>, QueryScope & { pageId: string }>({
    queryKey: ({ pageId, subject }) => [
      ...productivityKeys.resource("comment"),
      pageId,
      subject,
    ],
    query: ({ pageId }) => ({
      url: "/internal/task/comment",
      baseURL: null,
      method: "GET",
      params: { pageId },
      unwrapData: false,
    }),
    queryOptions: ({ pageId, subject }) => ({
      enabled: Boolean(pageId && subject),
    }),
  })
)
const filesListHook = createListHook<FileAsset>("file")
const favoritesListHook = createListHook<Favorite>("favorite")

const pageItemHook = createItemHook<Page>("page")
const databaseItemHook = createItemHook<Database>("database")

const createWorkspaceHook = createCreateHook<
  Workspace,
  Pick<Workspace, "name" | "slug" | "icon">
>("workspace")
const updateWorkspaceHook = createUpdateHook<
  Workspace,
  Partial<Pick<Workspace, "name" | "slug" | "icon" | "settings">>
>("workspace")
const createPageHook = createCreateHook<
  Page,
  Partial<Page> & Pick<Page, "workspaceId">
>("page")
const updatePageHook = createUpdateHook<Page, Partial<Page>>("page")
const deletePageHook = createDeleteHook<Page>("page")
const createBlockHook = createCreateHook<
  Block,
  Partial<Block> & Pick<Block, "workspaceId" | "pageId" | "type" | "content">
>("block")
const updateBlockHook = createUpdateHook<Block, Partial<Block>>("block")
const deleteBlockHook = createDeleteHook<Block>("block")
const createDatabaseHook = createCreateHook<
  Database,
  Partial<Database> & Pick<Database, "workspaceId" | "title">
>("database")
const updateDatabaseHook = createUpdateHook<Database, Partial<Database>>(
  "database"
)
const deleteDatabaseHook = createDeleteHook<Database>("database")
const createDatabasePropertyHook = createCreateHook<
  DatabaseProperty,
  Partial<DatabaseProperty> &
    Pick<DatabaseProperty, "workspaceId" | "databaseId" | "name" | "type">
>("database-property")
const updateDatabasePropertyHook = createUpdateHook<
  DatabaseProperty,
  Partial<DatabaseProperty>
>("database-property")
const createDatabaseViewHook = createCreateHook<
  DatabaseView,
  Partial<DatabaseView> &
    Pick<DatabaseView, "workspaceId" | "databaseId" | "name" | "type">
>("database-view")
const updateDatabaseViewHook = createUpdateHook<
  DatabaseView,
  Partial<DatabaseView>
>("database-view")
const deleteDatabaseViewHook = createDeleteHook<DatabaseView>("database-view")
const createPagePropertyValueHook = createCreateHook<
  PagePropertyValue,
  Pick<PagePropertyValue, "workspaceId" | "pageId" | "propertyId" | "value">
>("page-property-value")
const updatePagePropertyValueHook = createMutationService(
  defineMutation<
    PagePropertyValue,
    CompositeResourceInput<Pick<PagePropertyValue, "value">>
  >({
    query: ({ firstId, secondId, body }) => ({
      baseURL: null,
      url: `/internal/task/page-property-value/${firstId}/${secondId}`,
      method: "PATCH",
      body,
    }),
    invalidates: [
      productivityKeys.resource("page-property-value"),
      productivityKeys.resource("page"),
    ],
  })
)
const createCommentHook = createCreateHook<
  Comment,
  Pick<Comment, "workspaceId" | "pageId" | "content"> & Partial<Comment>
>("comment")
const deleteCommentHook = createMutationService(
  defineMutation<{ id: string }, { id: string; pageId: string }>({
    query: ({ id, pageId }) => ({
      url: "/internal/task/comment/" + id,
      baseURL: null,
      method: "DELETE",
      params: { pageId },
    }),
    invalidates: [productivityKeys.resource("comment")],
  })
)
const createFileHook = createCreateHook<
  FileAsset,
  Partial<FileAsset> &
    Pick<FileAsset, "workspaceId" | "name" | "mimeType" | "size" | "url">
>("file")
const createPermissionHook = createCreateHook<
  Permission,
  Partial<Permission> &
    Pick<Permission, "workspaceId" | "subjectType" | "level">
>("permission")

const createFavoriteHook = createMutationService(
  defineMutation<
    Favorite,
    Pick<Favorite, "workspaceId" | "pageId" | "position">
  >({
    query: (body) => ({
      baseURL: null,
      url: "/internal/task/favorite",
      method: "POST",
      body,
    }),
    invalidates: [productivityKeys.resource("favorite")],
  })
)
const deleteFavoriteHook = createMutationService(
  defineMutation<Favorite, CompositeResourceInput>({
    query: ({ firstId, secondId }) => ({
      baseURL: null,
      url: `/internal/task/favorite/${firstId}/${secondId}`,
      method: "DELETE",
    }),
    invalidates: [productivityKeys.resource("favorite")],
  })
)

export function useUsersQuery() {
  return usersListHook(useQueryScope())
}
export function useWorkspacesQuery() {
  return workspacesListHook(useQueryScope())
}
export function useWorkspaceMembersQuery(
  scope: Omit<QueryScope, "subject"> = {}
) {
  return workspaceMembersListHook({ ...scope, ...useQueryScope() })
}
export function usePagesQuery(scope: Omit<QueryScope, "subject"> = {}) {
  return pagesListHook({ ...scope, ...useQueryScope() })
}
export function useBlocksQuery(scope: Omit<QueryScope, "subject"> = {}) {
  return blocksListHook({ ...scope, ...useQueryScope() })
}
export function useDatabasesQuery(scope: Omit<QueryScope, "subject"> = {}) {
  return databasesListHook({ ...scope, ...useQueryScope() })
}
export function useDatabasePropertiesQuery(
  scope: Omit<QueryScope, "subject"> = {}
) {
  return databasePropertiesListHook({ ...scope, ...useQueryScope() })
}
export function usePagePropertyValuesQuery(
  scope: Omit<QueryScope, "subject"> = {}
) {
  return pagePropertyValuesListHook({ ...scope, ...useQueryScope() })
}
export function useDatabaseViewsQuery(scope: Omit<QueryScope, "subject"> = {}) {
  return databaseViewsListHook({ ...scope, ...useQueryScope() })
}
export function usePermissionsQuery(scope: Omit<QueryScope, "subject"> = {}) {
  return permissionsListHook({ ...scope, ...useQueryScope() })
}
export function useCommentsQuery(pageId: string) {
  return commentsListHook({ ...useQueryScope(), pageId })
}
export function useFilesQuery(scope: Omit<QueryScope, "subject"> = {}) {
  return filesListHook({ ...scope, ...useQueryScope() })
}
export function useFavoritesQuery() {
  return favoritesListHook(useQueryScope())
}
export function usePageQuery(id: string) {
  return pageItemHook({ ...useQueryScope(), id })
}
export function useDatabaseQuery(id: string) {
  return databaseItemHook({ ...useQueryScope(), id })
}

export function useCreateWorkspaceMutation() {
  return createWorkspaceHook()
}
export function useUpdateWorkspaceMutation() {
  return updateWorkspaceHook()
}
export function useCreatePageMutation() {
  return createPageHook()
}
export function useUpdatePageMutation() {
  return updatePageHook()
}
export function useDeletePageMutation() {
  return deletePageHook()
}
export function useCreateBlockMutation() {
  return createBlockHook()
}
export function useUpdateBlockMutation() {
  return updateBlockHook()
}
export function useDeleteBlockMutation() {
  return deleteBlockHook()
}
export function useCreateDatabaseMutation() {
  return createDatabaseHook()
}
export function useUpdateDatabaseMutation() {
  return updateDatabaseHook()
}
export function useDeleteDatabaseMutation() {
  return deleteDatabaseHook()
}
export function useCreateDatabasePropertyMutation() {
  return createDatabasePropertyHook()
}
export function useUpdateDatabasePropertyMutation() {
  return updateDatabasePropertyHook()
}
export function useCreateDatabaseViewMutation() {
  return createDatabaseViewHook()
}
export function useUpdateDatabaseViewMutation() {
  return updateDatabaseViewHook()
}
export function useDeleteDatabaseViewMutation() {
  return deleteDatabaseViewHook()
}
export function useCreatePagePropertyValueMutation() {
  return createPagePropertyValueHook()
}
export function useUpdatePagePropertyValueMutation() {
  return updatePagePropertyValueHook()
}
export function useCreateCommentMutation() {
  return createCommentHook()
}
export function useDeleteCommentMutation() {
  return deleteCommentHook()
}
export function useCreateFileMutation() {
  return createFileHook()
}
export function useCreatePermissionMutation() {
  return createPermissionHook()
}
export function useCreateFavoriteMutation() {
  return createFavoriteHook()
}
export function useDeleteFavoriteMutation() {
  return deleteFavoriteHook()
}

const deleteFileHook = createDeleteHook<FileAsset>("file")
export function useDeleteFileMutation() {
  return deleteFileHook()
}
