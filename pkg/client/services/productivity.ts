"use client"

import {
  createMutationService,
  createQueryService,
  useMutation,
  useQuery,
} from "@/utils/caller"
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

/* eslint-disable react-hooks/rules-of-hooks -- these helpers build caller service definitions. */

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
    useQuery<ApiListResponse<TData>, undefined>({
      queryKey: productivityKeys.resource(resource),
      query: {
        baseURL: null,
        url: `/${resource}`,
        method: "GET",
        params: { limit: 100, offset: 0 },
        unwrapData: false,
      },
    })
  )
}

function createItemHook<TData>(resource: string) {
  return createQueryService(
    useQuery<TData, string>({
      queryKey: (id) => productivityKeys.item(resource, id),
      query: (id) => ({
        baseURL: null,
        url: `/${resource}/${id}`,
        method: "GET",
      }),
      queryOptions: (id) => ({ enabled: Boolean(id) }),
    })
  )
}

function createCreateHook<TData, TBody>(resource: string) {
  return createMutationService(
    useMutation<TData, TBody>({
      query: (body) => ({
        baseURL: null,
        url: `/${resource}`,
        method: "POST",
        body,
      }),
      invalidates: [productivityKeys.resource(resource)],
    })
  )
}

function createUpdateHook<TData, TBody>(resource: string) {
  return createMutationService(
    useMutation<TData, UpdateResourceInput<TBody>>({
      query: ({ id, body }) => ({
        baseURL: null,
        url: `/${resource}/${id}`,
        method: "PATCH",
        body,
      }),
      invalidates: [productivityKeys.resource(resource)],
    })
  )
}

function createDeleteHook<TData>(resource: string) {
  return createMutationService(
    useMutation<TData, string>({
      query: (id) => ({
        baseURL: null,
        url: `/${resource}/${id}`,
        method: "DELETE",
      }),
      invalidates: [productivityKeys.resource(resource)],
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
const databasePropertiesListHook = createListHook<DatabaseProperty>(
  "database-property"
)
const pagePropertyValuesListHook = createListHook<PagePropertyValue>(
  "page-property-value"
)
const databaseViewsListHook = createListHook<DatabaseView>("database-view")
const permissionsListHook = createListHook<Permission>("permission")
const commentsListHook = createListHook<Comment>("comment")
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
  useMutation<
    PagePropertyValue,
    CompositeResourceInput<Pick<PagePropertyValue, "value">>
  >({
    query: ({ firstId, secondId, body }) => ({
      baseURL: null,
      url: `/page-property-value/${firstId}/${secondId}`,
      method: "PATCH",
      body,
    }),
    invalidates: [productivityKeys.resource("page-property-value")],
  })
)
const createCommentHook = createCreateHook<
  Comment,
  Pick<Comment, "workspaceId" | "pageId" | "content"> & Partial<Comment>
>("comment")
const deleteCommentHook = createDeleteHook<Comment>("comment")
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
  useMutation<Favorite, Pick<Favorite, "workspaceId" | "pageId" | "position">>({
    query: (body) => ({
      baseURL: null,
      url: "/favorite",
      method: "POST",
      body,
    }),
    invalidates: [productivityKeys.resource("favorite")],
  })
)
const deleteFavoriteHook = createMutationService(
  useMutation<Favorite, CompositeResourceInput>({
    query: ({ firstId, secondId }) => ({
      baseURL: null,
      url: `/favorite/${firstId}/${secondId}`,
      method: "DELETE",
    }),
    invalidates: [productivityKeys.resource("favorite")],
  })
)

export function useUsersQuery() {
  return usersListHook(undefined)
}
export function useWorkspacesQuery() {
  return workspacesListHook(undefined)
}
export function useWorkspaceMembersQuery() {
  return workspaceMembersListHook(undefined)
}
export function usePagesQuery() {
  return pagesListHook(undefined)
}
export function useBlocksQuery() {
  return blocksListHook(undefined)
}
export function useDatabasesQuery() {
  return databasesListHook(undefined)
}
export function useDatabasePropertiesQuery() {
  return databasePropertiesListHook(undefined)
}
export function usePagePropertyValuesQuery() {
  return pagePropertyValuesListHook(undefined)
}
export function useDatabaseViewsQuery() {
  return databaseViewsListHook(undefined)
}
export function usePermissionsQuery() {
  return permissionsListHook(undefined)
}
export function useCommentsQuery() {
  return commentsListHook(undefined)
}
export function useFilesQuery() {
  return filesListHook(undefined)
}
export function useFavoritesQuery() {
  return favoritesListHook(undefined)
}
export function usePageQuery(id: string) {
  return pageItemHook(id)
}
export function useDatabaseQuery(id: string) {
  return databaseItemHook(id)
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
