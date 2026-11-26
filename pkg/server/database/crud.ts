import { and, desc, eq, type SQL } from "drizzle-orm"
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core"
import { database } from "@/database"
import { createCrudSchemas } from "@/schemas/database"

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
}

export interface CrudActor {
  userId: string
  isAdmin: boolean
}

export interface CrudListOptions {
  limit?: number
  offset?: number
}

export interface CrudAuthorization {
  readScope?: (actor: CrudActor) => SQL | undefined
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
    const [row] = await database
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
      const rows = await database
        .select()
        .from(definition.table)
        .where(authorization.readScope?.(actor))
        .orderBy(desc(definition.orderBy))
        .limit(limit)
        .offset(offset)
      return { data: rows, pagination: { limit, offset } }
    },
    async get(actor: CrudActor, params: Record<string, string | undefined>) {
      const row = await find(params)
      await authorization.read?.(row, actor)
      return row
    },
    async create(actor: CrudActor, input: unknown) {
      const payload = parsePayload(
        schemas.insert,
        sanitizePayload(input, definition.createFields, definition.dateFields)
      )
      await authorization.create?.(payload, actor)
      const [row] = await database
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
      if (definition.touchUpdatedAt) payload.updatedAt = new Date()
      if (Object.keys(payload).length === 0)
        throw new CrudError(400, "empty_update", "No writable fields supplied")
      const [row] = await database
        .update(definition.table)
        .set(payload as never)
        .where(buildWhere(definition, params))
        .returning()
      if (!row) throw new CrudError(404, "not_found", `${name} not found`)
      return row
    },
    async remove(actor: CrudActor, params: Record<string, string | undefined>) {
      const existing = await find(params)
      await authorization.mutate?.(existing, actor)
      const [row] = await database
        .delete(definition.table)
        .where(buildWhere(definition, params))
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
