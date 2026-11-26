import { z } from "@gorth-com/structure/cores/zod"

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  isArchived: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  workspaceId: z.uuid().optional(),
  pageId: z.uuid().optional(),
  databaseId: z.uuid().optional(),
  search: z.string().trim().max(200).optional(),
  sort: z
    .enum(["createdAt", "updatedAt", "title", "position", "name"])
    .optional(),
  direction: z.enum(["asc", "desc"]).default("desc"),
})
export const safeUrlSchema = z.url().refine((value) => {
  try {
    const url = new URL(value)
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}, "Only HTTP(S) links without credentials are supported")
export const recordQuerySchema = listQuerySchema.extend({
  filterPropertyId: z.uuid().optional(),
  filterValue: z.string().max(1000).optional(),
  sortPropertyId: z.uuid().optional(),
})

const permissionSchema = z
  .object({
    workspaceId: z.uuid().optional(),
    pageId: z.uuid().nullable().optional(),
    databaseId: z.uuid().nullable().optional(),
    subjectType: z.enum(["user", "workspace", "public"]),
    subjectId: z.uuid().nullable().optional(),
    level: z.enum(["view", "comment", "edit", "full_access"]),
  })
  .refine(
    (value) => Boolean(value.pageId) !== Boolean(value.databaseId),
    "Choose one page or database"
  )
  .refine(
    (value) => value.subjectType !== "user" || Boolean(value.subjectId),
    "A user is required"
  )
  .refine(
    (value) =>
      value.subjectType !== "workspace" ||
      Boolean(value.workspaceId && value.subjectId === value.workspaceId),
    "Workspace grant must identify the owning workspace"
  )
  .refine(
    (value) =>
      value.subjectType !== "public" ||
      (value.level === "view" && !value.subjectId),
    "Public access must be read-only"
  )
export function validatePermission(value: unknown) {
  return permissionSchema.parse(value)
}

export const blockContentSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => JSON.stringify(value).length <= 100000,
    "Block is too large"
  )
export const propertyConfigSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => JSON.stringify(value).length <= 10000,
    "Property configuration is too large"
  )
export const restoreRevisionSchema = z.object({
  revisionId: z.uuid(),
  version: z.number().int().positive(),
})
export const documentAccessModeSchema = z.object({
  mode: z.enum(["workspace", "restricted"]),
})
export const reorderBlockSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(10000),
})
export const documentUploadSchema = z.object({
  bucket: z.uuid(),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().min(1).max(128),
  size: z
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024),
})
export const documentAttachmentSchema = z.object({ assetId: z.uuid() })
export const importDocumentSchema = z.object({
  workspaceId: z.uuid(),
  title: z.string().trim().min(1).max(1000),
  blocks: z
    .array(
      z.object({
        type: z.enum([
          "text",
          "heading_1",
          "heading_2",
          "heading_3",
          "todo",
          "quote",
          "code",
          "divider",
          "bulleted_list",
          "numbered_list",
          "callout",
          "toggle",
          "bookmark",
          "embed",
          "image",
          "video",
          "file",
        ]),
        content: blockContentSchema,
      })
    )
    .max(1000),
})

export function parsePropertyValue(
  type: string,
  raw: unknown,
  config: Record<string, unknown> = {}
) {
  const value =
    raw && typeof raw === "object" && "value" in raw
      ? (raw as { value: unknown }).value
      : raw
  if (value === null) return null
  if (
    [
      "formula",
      "rollup",
      "created_time",
      "created_by",
      "last_edited_time",
      "last_edited_by",
    ].includes(type)
  )
    throw new Error("computed_property_readonly")
  if (type === "number") return z.number().finite().parse(value)
  if (type === "checkbox") return z.boolean().parse(value)
  if (type === "date")
    return z.iso.datetime({ offset: true }).or(z.iso.date()).parse(value)
  if (type === "person" || type === "relation" || type === "file")
    return z.array(z.uuid()).max(100).parse(value)
  if (type === "multi_select") {
    const selected = z.array(z.string().max(255)).max(100).parse(value)
    if (Array.isArray(config.options)) {
      const allowed = config.options.map((option) =>
        typeof option === "string"
          ? option
          : String((option as { value?: unknown })?.value ?? "")
      )
      if (selected.some((option) => !allowed.includes(option)))
        throw new Error("invalid_property_option")
    }
    return [...new Set(selected)]
  }
  if (type === "url") return safeUrlSchema.parse(value)
  if (type === "email") return z.email().parse(value)
  const text = z.string().max(10000).parse(value)
  if (["select", "status"].includes(type) && Array.isArray(config.options)) {
    const options = config.options.map((option) =>
      typeof option === "string"
        ? option
        : String((option as { value?: unknown })?.value ?? "")
    )
    if (!options.includes(text)) throw new Error("invalid_property_option")
  }
  return text
}
