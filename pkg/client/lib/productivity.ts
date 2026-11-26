export interface Pagination {
  limit: number
  offset: number
}
export interface ApiListResponse<TData> {
  data: TData[]
  pagination: Pagination
}

export interface User {
  id: string
  externalUserId: string
  name: string
  email: string
  image: string | null
  metadata: Record<string, unknown>
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  ownerId: string
  name: string
  slug: string
  icon: string | null
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type WorkspaceRole = "owner" | "admin" | "member" | "guest"
export type WorkspaceMemberStatus = "invited" | "active" | "suspended"
export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: WorkspaceRole
  status: WorkspaceMemberStatus
  invitedById: string | null
  joinedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Page {
  id: string
  workspaceId: string
  parentPageId: string | null
  databaseId: string | null
  createdById: string
  updatedById: string | null
  title: string
  icon: string | null
  cover: string | null
  position: number
  isArchived: boolean
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type BlockType =
  | "text"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "todo"
  | "toggle"
  | "quote"
  | "callout"
  | "code"
  | "image"
  | "video"
  | "file"
  | "divider"
  | "bookmark"
  | "embed"
  | "database_child"
  | "page_child"
export interface Block {
  id: string
  workspaceId: string
  pageId: string
  parentBlockId: string | null
  createdById: string
  updatedById: string | null
  type: BlockType
  content: Record<string, unknown>
  position: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface Database {
  id: string
  workspaceId: string
  createdById: string
  title: string
  description: string | null
  icon: string | null
  cover: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type DatabasePropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "person"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "files"
  | "relation"
  | "rollup"
  | "formula"
  | "created_time"
  | "created_by"
  | "last_edited_time"
  | "last_edited_by"
export interface DatabaseProperty {
  id: string
  workspaceId: string
  databaseId: string
  name: string
  type: DatabasePropertyType
  config: Record<string, unknown>
  position: number
  createdAt: string
  updatedAt: string
}

export interface PagePropertyValue {
  workspaceId: string
  pageId: string
  propertyId: string
  value: unknown
  createdAt: string
  updatedAt: string
}

export type DatabaseViewType =
  "table" | "board" | "calendar" | "list" | "gallery" | "timeline"
export interface DatabaseView {
  id: string
  workspaceId: string
  databaseId: string
  createdById: string
  name: string
  type: DatabaseViewType
  config: Record<string, unknown>
  isDefault: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export type PermissionSubjectType = "user" | "workspace" | "public"
export type PermissionLevel = "view" | "comment" | "edit" | "full_access"
export interface Permission {
  id: string
  workspaceId: string
  pageId: string | null
  databaseId: string | null
  subjectType: PermissionSubjectType
  subjectId: string | null
  level: PermissionLevel
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  workspaceId: string
  pageId: string
  blockId: string | null
  parentCommentId: string | null
  authorId: string
  content: string
  resolvedAt: string | null
  editedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FileAsset {
  id: string
  workspaceId: string
  pageId: string | null
  blockId: string | null
  uploadedById: string
  name: string
  mimeType: string
  size: number
  url: string
  storageKey: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Favorite {
  workspaceId: string
  userId: string
  pageId: string
  position: number
  createdAt: string
}
