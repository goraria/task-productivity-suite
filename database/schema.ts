import { userTable } from "@/database/auth"
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
export {
  accountTable,
  legacySessionTable,
  legacyVerificationTable,
  proofTable,
  rateLimitTable,
  revocationTable,
  sessionTable,
  userStatus,
  userTable,
  verificationTable,
} from "@/database/auth"
export { resourcePolicyOutboxTable } from "@/database/resource-policy"

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
    accessMode: varchar("access_mode", { length: 16 })
      .notNull()
      .default("workspace"),
    description: text("description"),
    icon: text("icon"),
    cover: text("cover"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "database_access_mode_check",
      sql`${table.accessMode} in ('workspace','restricted')`
    ),
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
    version: integer("version").notNull().default(1),
    accessMode: varchar("access_mode", { length: 16 })
      .notNull()
      .default("workspace"),
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
    check(
      "page_access_mode_check",
      sql`${table.accessMode} in ('workspace','restricted')`
    ),
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
    version: integer("version").notNull().default(1),
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

// Document history is Task-owned domain data, not a duplicate platform audit log.
export const documentPresenceTable = pgTable(
  "document_presence",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.pageId, table.userId] })]
)

export const documentRevisionsTable = pgTable(
  "document_revision",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(),
    entityType: varchar("entity_type", { length: 16 }).notNull(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("document_revision_page_created_idx").on(
      table.pageId,
      table.createdAt
    ),
    uniqueIndex("document_revision_entity_version_key").on(
      table.entityId,
      table.version
    ),
    check(
      "document_revision_type_check",
      sql`${table.entityType} in ('page','block')`
    ),
  ]
)

export const sprintsTable = pgTable(
  "sprint",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    goal: text("goal"),
    status: varchar("status", { length: 16 }).notNull().default("planned"),
    startsAt: timestamp("starts_at", { mode: "date" }),
    endsAt: timestamp("ends_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("sprint_workspace_idx").on(table.workspaceId),
    check(
      "sprint_status_check",
      sql`${table.status} in ('planned','active','completed')`
    ),
    check(
      "sprint_dates_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`
    ),
  ]
)

export const workItemsTable = pgTable(
  "work_item",
  {
    pageId: uuid("page_id")
      .primaryKey()
      .references(() => pagesTable.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    kind: varchar("kind", { length: 16 }).notNull().default("task"),
    status: varchar("status", { length: 24 }).notNull().default("backlog"),
    priority: varchar("priority", { length: 16 }).notNull().default("medium"),
    assigneeId: uuid("assignee_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    sprintId: uuid("sprint_id").references(() => sprintsTable.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at", { mode: "date" }),
    estimate: integer("estimate"),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (table) => [
    uniqueIndex("work_item_workspace_number_key").on(
      table.workspaceId,
      table.number
    ),
    index("work_item_sprint_idx").on(table.sprintId),
    check(
      "work_item_kind_check",
      sql`${table.kind} in ('task','bug','story','epic')`
    ),
    check(
      "work_item_status_check",
      sql`${table.status} in ('backlog','todo','in_progress','review','done','cancelled')`
    ),
    check(
      "work_item_priority_check",
      sql`${table.priority} in ('low','medium','high','urgent')`
    ),
    check(
      "work_item_estimate_check",
      sql`${table.estimate} is null or ${table.estimate} >= 0`
    ),
  ]
)

export const issueDependenciesTable = pgTable(
  "issue_dependency",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => workItemsTable.pageId, { onDelete: "cascade" }),
    dependsOnId: uuid("depends_on_id")
      .notNull()
      .references(() => workItemsTable.pageId, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.pageId, table.dependsOnId] }),
    check(
      "issue_dependency_self_check",
      sql`${table.pageId} <> ${table.dependsOnId}`
    ),
  ]
)

// Delivery state only. Notification content, index documents, audit events,
// payments, entitlements and media remain owned by their platform services.
export const taskEventsTable = pgTable(
  "task_event_outbox",
  {
    lastError: text("last_error"),
    sequence: bigint("sequence", {
      mode: "number",
    }).generatedAlwaysAsIdentity(),
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    pageId: uuid("page_id"),
    actorId: uuid("actor_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    leaseToken: uuid("lease_token"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("task_event_pending_idx").on(table.deliveredAt, table.availableAt),
    index("task_event_page_sequence_idx").on(
      table.pageId,
      table.sequence.desc()
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
    subjectId: uuid("subject_id"),
    level: permissionLevel("level").notNull().default("view"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("permission_target_subject_key").on(
      table.workspaceId,
      sql`coalesce(${table.pageId}::text,'')`,
      sql`coalesce(${table.databaseId}::text,'')`,
      table.subjectType,
      sql`coalesce(${table.subjectId}::text,'')`
    ),
    index("permission_page_subject_idx").on(
      table.pageId,
      table.subjectType,
      table.subjectId
    ),
    index("permission_database_subject_idx").on(
      table.databaseId,
      table.subjectType,
      table.subjectId
    ),
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

export type UserRow = typeof userTable.$inferSelect
