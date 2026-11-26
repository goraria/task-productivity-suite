import { userTable } from "./auth"
export {
  userStatus,
  userTable,
  sessionTable,
  verificationTable,
  revocationTable,
  proofTable,
} from "./auth"
import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

export const workspaceRole = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
  "guest",
])
export const workspaceMemberStatus = pgEnum("workspace_member_status", [
  "invited",
  "active",
  "suspended",
])
export const blockType = pgEnum("block_type", [
  "text",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list",
  "numbered_list",
  "todo",
  "toggle",
  "quote",
  "callout",
  "code",
  "image",
  "video",
  "file",
  "divider",
  "bookmark",
  "embed",
  "database_child",
  "page_child",
])
export const databasePropertyType = pgEnum("database_property_type", [
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "checkbox",
  "url",
  "email",
  "phone",
  "file",
  "relation",
  "rollup",
  "formula",
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
])
export const databaseViewType = pgEnum("database_view_type", [
  "table",
  "board",
  "calendar",
  "list",
  "gallery",
  "timeline",
])
export const permissionSubjectType = pgEnum("permission_subject_type", [
  "user",
  "workspace",
  "public",
])
export const permissionLevel = pgEnum("permission_level", [
  "view",
  "comment",
  "edit",
  "full_access",
])

export const workspacesTable = pgTable(
  "workspace",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    icon: text("icon"),
    settings: jsonb("settings").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_slug_key").on(table.slug),
    index("workspace_owner_id_idx").on(table.ownerId),
  ]
)

export const workspaceMembersTable = pgTable(
  "workspace_member",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull().default("member"),
    status: workspaceMemberStatus("status").notNull().default("active"),
    invitedById: uuid("invited_by_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    joinedAt: timestamp("joined_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_member_user_id_status_idx").on(table.userId, table.status),
  ]
)

export const databasesTable = pgTable(
  "database",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    icon: text("icon"),
    cover: text("cover"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("database_workspace_id_updated_at_idx").on(
      table.workspaceId,
      table.updatedAt
    ),
  ]
)

export const pagesTable = pgTable(
  "page",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    parentPageId: uuid("parent_page_id"),
    databaseId: uuid("database_id").references(() => databasesTable.id, {
      onDelete: "cascade",
    }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    updatedById: uuid("updated_by_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull().default("Untitled"),
    icon: text("icon"),
    cover: text("cover"),
    position: integer("position").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentPageId],
      foreignColumns: [table.id],
      name: "page_parent_page_id_fkey",
    }).onDelete("cascade"),
    index("page_workspace_id_parent_page_id_idx").on(
      table.workspaceId,
      table.parentPageId
    ),
    index("page_database_id_updated_at_idx").on(
      table.databaseId,
      table.updatedAt
    ),
  ]
)

export const blocksTable = pgTable(
  "block",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    parentBlockId: uuid("parent_block_id"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    updatedById: uuid("updated_by_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    type: blockType("type").notNull().default("text"),
    content: jsonb("content").notNull().default(sql.raw("'{}'::jsonb")),
    position: integer("position").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.parentBlockId],
      foreignColumns: [table.id],
      name: "block_parent_block_id_fkey",
    }).onDelete("cascade"),
    index("block_page_id_parent_block_id_position_idx").on(
      table.pageId,
      table.parentBlockId,
      table.position
    ),
  ]
)

export const databasePropertiesTable = pgTable(
  "database_property",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databasesTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: databasePropertyType("type").notNull(),
    config: jsonb("config").notNull().default(sql.raw("'{}'::jsonb")),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("database_property_database_id_name_key").on(
      table.databaseId,
      table.name
    ),
    index("database_property_database_id_position_idx").on(
      table.databaseId,
      table.position
    ),
  ]
)

export const pagePropertyValuesTable = pgTable(
  "page_property_value",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => databasePropertiesTable.id, { onDelete: "cascade" }),
    value: jsonb("value").notNull().default(sql.raw("'null'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.pageId, table.propertyId] }),
    index("page_property_value_workspace_id_idx").on(table.workspaceId),
  ]
)

export const databaseViewsTable = pgTable(
  "database_view",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databasesTable.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: databaseViewType("type").notNull().default("table"),
    config: jsonb("config").notNull().default(sql.raw("'{}'::jsonb")),
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("database_view_database_id_position_idx").on(
      table.databaseId,
      table.position
    ),
  ]
)

export const permissionsTable = pgTable(
  "permission",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pagesTable.id, {
      onDelete: "cascade",
    }),
    databaseId: uuid("database_id").references(() => databasesTable.id, {
      onDelete: "cascade",
    }),
    subjectType: permissionSubjectType("subject_type").notNull(),
    subjectId: uuid("subject_id").references(() => userTable.id, {
      onDelete: "cascade",
    }),
    level: permissionLevel("level").notNull().default("view"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("permission_workspace_id_subject_idx").on(
      table.workspaceId,
      table.subjectType,
      table.subjectId
    ),
    check(
      "permission_resource_check",
      sql`(${table.pageId} is not null and ${table.databaseId} is null) or (${table.pageId} is null and ${table.databaseId} is not null)`
    ),
    check(
      "permission_subject_check",
      sql`(${table.subjectType} = 'public' and ${table.subjectId} is null) or (${table.subjectType} <> 'public' and ${table.subjectId} is not null)`
    ),
  ]
)

export const filesTable = pgTable(
  "file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pagesTable.id, {
      onDelete: "cascade",
    }),
    blockId: uuid("block_id").references(() => blocksTable.id, {
      onDelete: "cascade",
    }),
    uploadedById: uuid("uploaded_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    size: integer("size").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    metadata: jsonb("metadata").notNull().default(sql.raw("'{}'::jsonb")),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("file_workspace_id_created_at_idx").on(
      table.workspaceId,
      table.createdAt
    ),
    check("file_size_check", sql`${table.size} >= 0`),
  ]
)

export type User = typeof userTable.$inferSelect
export type NewUser = typeof userTable.$inferInsert
export type Workspace = typeof workspacesTable.$inferSelect
export type NewWorkspace = typeof workspacesTable.$inferInsert
export type WorkspaceMember = typeof workspaceMembersTable.$inferSelect
export type NewWorkspaceMember = typeof workspaceMembersTable.$inferInsert
export type Page = typeof pagesTable.$inferSelect
export type NewPage = typeof pagesTable.$inferInsert
export type Block = typeof blocksTable.$inferSelect
export type NewBlock = typeof blocksTable.$inferInsert
export type Database = typeof databasesTable.$inferSelect
export type NewDatabase = typeof databasesTable.$inferInsert
export type DatabaseProperty = typeof databasePropertiesTable.$inferSelect
export type NewDatabaseProperty = typeof databasePropertiesTable.$inferInsert
export type PagePropertyValue = typeof pagePropertyValuesTable.$inferSelect
export type NewPagePropertyValue = typeof pagePropertyValuesTable.$inferInsert
export type DatabaseView = typeof databaseViewsTable.$inferSelect
export type NewDatabaseView = typeof databaseViewsTable.$inferInsert
export type Permission = typeof permissionsTable.$inferSelect
export type NewPermission = typeof permissionsTable.$inferInsert
export type File = typeof filesTable.$inferSelect
export type NewFile = typeof filesTable.$inferInsert

// Shared operational tables used by the Hono server on serverless runtimes.
export const rateLimitTable = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
})
