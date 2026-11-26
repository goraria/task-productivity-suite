import { getDatabase } from "@/database"
import { documentRevisionsTable, pagesTable } from "@/database/schema"
import { createCrudSchemas } from "@/schemas/database"
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
  type SQL,
} from "drizzle-orm"
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core"

type KeyKind = "uuid" | "enum" | "text"

export interface CrudKey {
  param: string
  column: AnyPgColumn
  kind: KeyKind
  values?: readonly string[]
}

export interface CrudDefinition {
  table: AnyPgTable
  keys: readonly CrudKey[]
  createFields: readonly string[]
  updateFields: readonly string[]
  dateFields?: readonly string[]
  orderBy: AnyPgColumn
  touchUpdatedAt?: boolean
  filters?: readonly string[]
  searchField?: string
  revisionKind?: "page" | "block"
  searchableDocument?: boolean
}

export interface CrudActor {
  userId: string
  isAdmin: boolean
}

export interface CrudListOptions {
  limit?: number
  offset?: number
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
  propertySortExpression?: SQL
  propertyFilterExpression?: SQL
}

export interface CrudAuthorization {
  readScope?: (actor: CrudActor) => SQL | undefined
  writeScope?: (actor: CrudActor) => SQL | undefined
  read?: (
    row: Record<string, unknown>,
    actor: CrudActor
  ) => Promise<void> | void
  create?: (
    payload: Record<string, unknown>,
    actor: CrudActor
  ) => Promise<void> | void
  mutate?: (
    row: Record<string, unknown>,
    actor: CrudActor
  ) => Promise<void> | void
  prepareUpdate?: (
    payload: Record<string, unknown>,
    existing: Record<string, unknown>,
    actor: CrudActor
  ) => Promise<void> | void
}

export class CrudError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function crudKey(
  param: string,
  column: AnyPgColumn,
  kind: KeyKind = "uuid",
  values?: readonly string[]
): CrudKey {
  return { param, column, kind, values }
}

export function readString(record: Record<string, unknown>, field: string) {
  const value = record[field]
  return typeof value === "string" ? value : null
}

export function requireOwnedField(
  record: Record<string, unknown>,
  field: string,
  actor: CrudActor
) {
  const value = readString(record, field)
  if (!value) throw new CrudError(400, "missing_owner", `${field} is required`)
  if (value !== actor.userId)
    throw new CrudError(403, "forbidden", "Resource belongs to another user")
}

function parseKeyValue(value: string | undefined, item: CrudKey) {
  if (!value)
    throw new CrudError(400, "invalid_key", `${item.param} is required`)
  if (item.kind === "uuid" && !uuidPattern.test(value)) {
    throw new CrudError(400, "invalid_uuid", `${item.param} must be a UUID`)
  }
  if (item.kind === "enum" && !item.values?.includes(value)) {
    throw new CrudError(
      400,
      "invalid_enum",
      `${item.param} must be one of: ${item.values?.join(", ")}`
    )
  }
  return value
}

function buildWhere(
  definition: CrudDefinition,
  params: Record<string, string | undefined>
) {
  const condition = and(
    ...definition.keys.map((item) =>
      eq(item.column, parseKeyValue(params[item.param], item))
    )
  )
  if (!condition)
    throw new CrudError(400, "invalid_key", "Resource key is required")
  return condition
}

function sanitizePayload(
  input: unknown,
  fields: readonly string[],
  dateFields: readonly string[] = []
) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CrudError(400, "invalid_body", "JSON object body is required")
  }
  const source = input as Record<string, unknown>
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) continue
    const value = source[field]
    if (dateFields.includes(field) && value !== null && value !== undefined) {
      const date = value instanceof Date ? value : new Date(String(value))
      if (Number.isNaN(date.getTime()))
        throw new CrudError(400, "invalid_date", `${field} must be a date`)
      payload[field] = date
    } else {
      payload[field] = value
    }
  }
  return payload
}

export function createCrudRepository(
  name: string,
  definition: CrudDefinition,
  authorization: CrudAuthorization = {}
) {
  const schemas = createCrudSchemas(
    definition.table,
    definition.createFields,
    definition.updateFields
  )

  function parsePayload(
    schema: typeof schemas.insert | typeof schemas.update,
    input: Record<string, unknown>
  ) {
    const result = schema.safeParse(input)
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")
      throw new CrudError(400, "invalid_body", message)
    }
    return result.data as Record<string, unknown>
  }

  async function find(params: Record<string, string | undefined>) {
    const [row] = await getDatabase()
      .select()
      .from(definition.table)
      .where(buildWhere(definition, params))
      .limit(1)
    if (!row) throw new CrudError(404, "not_found", `${name} not found`)
    return row as Record<string, unknown>
  }

  return {
    async list(actor: CrudActor, options: CrudListOptions = {}) {
      const limit = Math.min(Math.max(options.limit ?? 20, 1), 100)
      const offset = Math.max(options.offset ?? 0, 0)
      const columns = getTableColumns(definition.table) as Record<
        string,
        AnyPgColumn
      >
      const conditions = [authorization.readScope?.(actor)]
      if (options.propertyFilterExpression)
        conditions.push(options.propertyFilterExpression)
      for (const field of definition.filters ?? []) {
        const value = options[field as keyof CrudListOptions]
        if (value !== undefined && columns[field])
          conditions.push(eq(columns[field], value))
        else if (
          field === "databaseId" &&
          value !== undefined &&
          columns.pageId
        )
          conditions.push(
            sql`exists(select 1 from page p where p.id = ${columns.pageId} and p.database_id = ${value}::uuid)`
          )
      }
      if (options.search && definition.searchField) {
        const pattern = `%${options.search.replace(/[\\%_]/g, "\\$&")}%`
        conditions.push(
          or(
            ilike(columns[definition.searchField]!, pattern),
            definition.searchableDocument
              ? sql`exists(select 1 from block b where b.page_id = ${columns.id} and b.is_archived = false and b.content->>'text' ilike ${pattern})`
              : undefined
          )
        )
      }
      if (
        !options.propertyFilterExpression &&
        definition.searchableDocument &&
        options.filterPropertyId &&
        options.filterValue !== undefined
      )
        conditions.push(
          sql`exists(select 1 from page_property_value v where v.page_id = ${columns.id} and v.property_id = ${options.filterPropertyId}::uuid and (v.value->>'value' = ${options.filterValue} or v.value->'value' @> jsonb_build_array(${options.filterValue}::text)))`
        )
      const where = and(...conditions)
      const sortColumn =
        options.sort && columns[options.sort]
          ? columns[options.sort]
          : definition.orderBy
      const propertySort =
        options.propertySortExpression ??
        (definition.searchableDocument && options.sortPropertyId
          ? sql`(select nullif(v.value->'value','null'::jsonb) from page_property_value v where v.page_id = ${columns.id} and v.property_id = ${options.sortPropertyId}::uuid limit 1)`
          : undefined)
      const order =
        options.direction === "asc"
          ? asc(propertySort ?? sortColumn!)
          : desc(propertySort ?? sortColumn!)
      const rows = await getDatabase()
        .select()
        .from(definition.table)
        .where(where)
        .orderBy(order, ...definition.keys.map((key) => asc(key.column)))
        .limit(limit)
        .offset(offset)
      const [result] = await getDatabase()
        .select({ total: count() })
        .from(definition.table)
        .where(where)
      const total = Number(result?.total ?? 0)
      return {
        data: rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + rows.length < total,
        },
      }
    },
    async get(actor: CrudActor, params: Record<string, string | undefined>) {
      const row = await find(params)
      await authorization.read?.(row, actor)
      return row
    },
    async create(actor: CrudActor, input: unknown) {
      const draft = parsePayload(
        schemas.insert.partial(),
        sanitizePayload(input, definition.createFields, definition.dateFields)
      )
      await authorization.create?.(draft, actor)
      const payload = parsePayload(schemas.insert, draft)
      const [row] = await getDatabase()
        .insert(definition.table)
        .values(payload as never)
        .returning()
      if (!row)
        throw new CrudError(500, "create_failed", `Could not create ${name}`)
      return row
    },
    async update(
      actor: CrudActor,
      params: Record<string, string | undefined>,
      input: unknown
    ) {
      const existing = await find(params)
      await authorization.mutate?.(existing, actor)
      const payload = parsePayload(
        schemas.update,
        sanitizePayload(input, definition.updateFields, definition.dateFields)
      )
      if (!definition.revisionKind)
        await authorization.prepareUpdate?.(payload, existing, actor)
      if (Object.keys(payload).length === 0)
        throw new CrudError(400, "empty_update", "No writable fields supplied")
      if (definition.touchUpdatedAt) payload.updatedAt = new Date()
      if (definition.revisionKind) {
        const expected =
          input && typeof input === "object"
            ? (input as Record<string, unknown>).version
            : undefined
        if (!Number.isSafeInteger(expected) || Number(expected) < 1)
          throw new CrudError(
            428,
            "version_required",
            "Supply the version being edited"
          )
        return getDatabase().transaction(async (transaction) => {
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${`hierarchy:${existing.workspaceId}`},0))`
          )
          await authorization.prepareUpdate?.(payload, existing, actor)
          if (definition.revisionKind === "block")
            await transaction
              .select({ id: pagesTable.id })
              .from(pagesTable)
              .where(eq(pagesTable.id, String(existing.pageId)))
              .for("update")
          const [locked] = await transaction
            .select()
            .from(definition.table)
            .where(buildWhere(definition, params))
            .for("update")
          if (!locked || locked.version !== expected)
            throw new CrudError(
              409,
              "version_conflict",
              "This document changed; reload before saving"
            )
          await transaction
            .insert(documentRevisionsTable)
            .values({
              pageId: String(
                definition.revisionKind === "page" ? locked.id : locked.pageId
              ),
              entityId: String(locked.id),
              entityType: definition.revisionKind!,
              version: Number(locked.version),
              snapshot: locked,
              createdById: actor.userId,
            })
            .onConflictDoNothing()
          const [row] = await transaction
            .update(definition.table)
            .set({
              ...payload,
              version: Number(expected) + 1,
              updatedById: actor.userId,
            } as never)
            .where(
              and(
                buildWhere(definition, params),
                authorization.writeScope?.(actor)
              )
            )
            .returning()
          if (!row)
            throw new CrudError(
              403,
              "access_forbidden",
              "Write permission was revoked"
            )
          return row
        })
      }
      const [row] = await getDatabase()
        .update(definition.table)
        .set(payload as never)
        .where(
          and(buildWhere(definition, params), authorization.writeScope?.(actor))
        )
        .returning()
      if (!row) throw new CrudError(404, "not_found", `${name} not found`)
      return row
    },
    async remove(actor: CrudActor, params: Record<string, string | undefined>) {
      const existing = await find(params)
      await authorization.mutate?.(existing, actor)
      const [row] = await getDatabase()
        .delete(definition.table)
        .where(
          and(buildWhere(definition, params), authorization.writeScope?.(actor))
        )
        .returning()
      if (!row) throw new CrudError(404, "not_found", `${name} not found`)
      return row
    },
  }
}

export function getDatabaseError(error: unknown) {
  let current = error
  while (current && typeof current === "object") {
    if ("code" in current) {
      const code = String((current as { code?: unknown }).code ?? "")
      if (code) return code
    }
    current = "cause" in current ? (current as { cause?: unknown }).cause : null
  }
  return ""
}
