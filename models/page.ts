import { getDatabase } from "@/database"
import { CrudError, type CrudActor, type CrudListOptions, createCrudRepository, crudKey } from "@/database/crud"
import { pagesTable, databasePropertiesTable, pagePropertyValuesTable } from "@/database/schema"
import { eq, inArray, sql, type SQL, and } from "drizzle-orm"
import { assertAccess, pageLevel, getAccessLevel, pageScope } from "@/database/authorization"
import "server-only"
import { z } from "@gorth-com/structure/cores/zod"
import { assignActor, getWorkspaceId } from "@/database/access"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"
import { formulaQuery } from "@/utils/formula-query"

export async function rawListDatabaseRecords(
  actor: CrudActor,
  id: string,
  options: CrudListOptions
) {
  await assertAccess("database", id, actor)
  const database = getDatabase()
  const properties = await database
    .select()
    .from(databasePropertiesTable)
    .where(eq(databasePropertiesTable.databaseId, id))
    .orderBy(databasePropertiesTable.position)
  const propertyQuery = rawCreatePropertyQuery(properties, actor)
  const query = { ...options, databaseId: id }
  if (options.sortPropertyId)
    query.propertySortExpression = sql`nullif(${propertyQuery(options.sortPropertyId)}, 'null'::jsonb)`
  if (options.filterPropertyId && options.filterValue !== undefined) {
    const expression = propertyQuery(options.filterPropertyId)
    query.propertyFilterExpression = sql`(${expression} #>> '{}' = ${options.filterValue} or ${expression} @> jsonb_build_array(${options.filterValue}::text))`
  }
  const result = await rawListPages(actor, query)
  const ids = result.data.map((page) => String(page.id))
  const levels = ids.length
    ? await database.execute<{ id: string; level: number }>(
        sql`select ${pagesTable.id} as id, ${pageLevel(pagesTable.id, actor)} as level from ${pagesTable} where ${inArray(pagesTable.id, ids)}`
      )
    : []
  const values = ids.length
    ? await database
        .select()
        .from(pagePropertyValuesTable)
        .where(inArray(pagePropertyValuesTable.pageId, ids))
    : []
  const calculated = properties.filter((property) =>
    [
      "formula",
      "rollup",
      "created_time",
      "created_by",
      "last_edited_time",
      "last_edited_by",
    ].includes(property.type)
  )
  const computed = []
  if (calculated.length && ids.length) {
    const objects = []
    for (let offset = 0; offset < calculated.length; offset += 30) {
      objects.push(
        sql`jsonb_build_object(${sql.join(
          calculated
            .slice(offset, offset + 30)
            .flatMap((property) => [
              sql`${property.id}::text`,
              propertyQuery(property.id),
            ]),
          sql`, `
        )})`
      )
    }
    const rows = await database.execute<{
      id: string
      values: Record<string, unknown>
    }>(
      sql`select ${pagesTable.id} as id, ${sql.join(objects, sql` || `)} as values from ${pagesTable} where ${inArray(pagesTable.id, ids)}`
    )
    for (const row of rows) {
      const page = result.data.find((item) => item.id === row.id)!
      for (const [propertyId, value] of Object.entries(row.values))
        computed.push({
          workspaceId: page.workspaceId,
          pageId: row.id,
          propertyId,
          value: { value },
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        })
    }
  }
  return {
    ...result,
    data: result.data.map((page) => ({
      ...(page as typeof pagesTable.$inferSelect),
      accessLevel: Number(levels.find((row) => row.id === page.id)?.level ?? 0),
    })),
    properties,
    values: [
      ...values.filter(
        (value) =>
          !calculated.some((property) => property.id === value.propertyId)
      ),
      ...computed,
    ],
  }
}

const repository = createCrudRepository(
  "page",
  {
    table: pagesTable,
    keys: [crudKey("id", pagesTable.id)],
    createFields: [
      "workspaceId",
      "parentPageId",
      "databaseId",
      "createdById",
      "updatedById",
      "title",
      "accessMode",
      "icon",
      "cover",
      "position",
      "isArchived",
    ],
    updateFields: [
      "parentPageId",
      "databaseId",
      "updatedById",
      "title",
      "icon",
      "cover",
      "position",
      "isArchived",
    ],
    dateFields: ["publishedAt"],
    orderBy: pagesTable.updatedAt,
    touchUpdatedAt: true,
    filters: ["workspaceId", "pageId", "databaseId", "isArchived"],
    searchField: "title",
    revisionKind: "page",
    searchableDocument: true,
  },
  {
    readScope: (actor) => pageScope(pagesTable.id, actor),
    writeScope: (actor) => pageScope(pagesTable.id, actor, "edit"),
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view", "page"),
    create: async (payload, actor) => {
      await assertAccess("workspace", getWorkspaceId(payload), actor, "edit")
      await rawValidateReferences(payload, actor)
      if (
        payload.accessMode !== undefined &&
        !["workspace", "restricted"].includes(String(payload.accessMode))
      )
        throw new CrudError(
          400,
          "invalid_access_mode",
          "Choose workspace or restricted access"
        )
      if (payload.title !== undefined)
        payload.title = z.string().trim().min(1).max(1000).parse(payload.title)
      assignActor(payload, "createdById", actor)
      assignActor(payload, "updatedById", actor)
    },
    mutate: (row, actor) =>
      rawAssertTargetAccess(row, actor, "edit", "page"),
    prepareUpdate: async (payload, row, actor) => {
      if (payload.title !== undefined)
        payload.title = z.string().trim().min(1).max(1000).parse(payload.title)
      if (
        payload.accessMode !== undefined &&
        !["workspace", "restricted"].includes(String(payload.accessMode))
      )
        throw new CrudError(
          400,
          "invalid_access_mode",
          "Choose workspace or restricted access"
        )
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      if (
        payload.isPublished !== undefined ||
        payload.publishedAt !== undefined ||
        payload.accessMode !== undefined
      )
        await rawAssertTargetAccess(row, actor, "manage", "page")
    },
  }
)

export async function rawListPages(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, { isArchived: false, ...options })
  } catch (error) {
    throw error
  }
}

export async function rawGetPage(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    const page = await repository.get(actor, params)
    return {
      ...(page as typeof pagesTable.$inferSelect),
      accessLevel: await getAccessLevel("page", String(page.id), actor),
    }
  } catch (error) {
    throw error
  }
}

export async function rawCreatePage(actor: CrudActor, input: unknown) {
  try {
    return (await repository.create(
      actor,
      input
    )) as typeof pagesTable.$inferSelect
  } catch (error) {
    throw error
  }
}

export async function rawUpdatePage(
  actor: CrudActor,
  params: Record<string, string | undefined>,
  input: unknown
) {
  try {
    if (
      input &&
      typeof input === "object" &&
      ["accessMode", "isPublished", "publishedAt"].some(
        (field) => field in input
      )
    )
      throw new CrudError(
        400,
        "sharing_action_required",
        "Use the document publication/access-mode action to change sharing"
      )
    return await repository.update(actor, params, input)
  } catch (error) {
    throw error
  }
}

export async function rawDeletePage(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    const row = await repository.get(actor, params)
    return await repository.update(actor, params, {
      isArchived: true,
      version: row.version,
    })
  } catch (error) {
    throw error
  }
}

type Property = typeof databasePropertiesTable.$inferSelect

export function rawCreatePropertyQuery(properties: Property[], actor: CrudActor) {
  const cache = new Map<string, SQL>()
  const visiting = new Set<string>()
  let nodes = 0
  function read(id: string): SQL {
    const cached = cache.get(id)
    if (cached) return cached
    if (visiting.has(id) || ++nodes > 1000)
      throw new CrudError(
        400,
        "formula_cycle",
        "Computed properties must not contain cycles or excessive dependencies"
      )
    const property = properties.find((item) => item.id === id)
    if (!property)
      throw new CrudError(
        400,
        "invalid_property",
        "Formula references an unknown property"
      )
    visiting.add(id)
    const config = property.config as Record<string, unknown>
    let value: SQL
    if (property.type === "title") value = sql`to_jsonb(${pagesTable.title})`
    else if (property.type === "formula")
      value = formulaQuery(config.expression, read)
    else if (property.type === "rollup") {
      const relation = properties.find(
        (item) =>
          item.id === config.relationPropertyId && item.type === "relation"
      )
      if (
        !relation ||
        typeof config.targetPropertyId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(config.targetPropertyId)
      )
        throw new CrudError(
          400,
          "invalid_rollup",
          "Choose a relation and target property"
        )
      const linked = read(relation.id)
      const aggregate =
        config.operation === "sum"
          ? sql`sum((rv.value->>'value')::numeric)`
          : config.operation === "average"
            ? sql`avg((rv.value->>'value')::numeric)`
            : config.operation === "minimum"
              ? sql`min((rv.value->>'value')::numeric)`
              : config.operation === "maximum"
                ? sql`max((rv.value->>'value')::numeric)`
                : sql`count(*)`
      value = sql`(select to_jsonb(${aggregate}) from page related left join page_property_value rv on rv.page_id = related.id and rv.property_id = ${config.targetPropertyId}::uuid
        where related.workspace_id = ${pagesTable.workspaceId} and related.is_archived = false
        and ${pageScope(sql`related.id`, actor)} and related.id::text in (select jsonb_array_elements_text(case when jsonb_typeof(${linked}) = 'array' then ${linked} else '[]'::jsonb end))
        ${config.operation === "count" || !config.operation ? sql`` : sql`and jsonb_typeof(rv.value->'value') = 'number'`})`
    } else if (property.type === "created_time")
      value = sql`to_jsonb(${pagesTable.createdAt})`
    else if (property.type === "created_by")
      value = sql`to_jsonb(${pagesTable.createdById})`
    else if (property.type === "last_edited_time")
      value = sql`to_jsonb(${pagesTable.updatedAt})`
    else if (property.type === "last_edited_by")
      value = sql`to_jsonb(${pagesTable.updatedById})`
    else
      value = sql`(select pv.value->'value' from page_property_value pv where pv.page_id = ${pagesTable.id} and pv.property_id = ${id}::uuid limit 1)`
    visiting.delete(id)
    const normalized = sql`coalesce(${value}, 'null'::jsonb)`
    cache.set(id, normalized)
    return normalized
  }
  return read
}

export async function rawListReadableResourcePages(
  actor: CrudActor,
  ids: string[]
) {
  if (!ids.length) return []
  return await getDatabase()
    .select({ id: pagesTable.id, workspaceId: pagesTable.workspaceId })
    .from(pagesTable)
    .where(
      and(
        inArray(pagesTable.id, ids),
        eq(pagesTable.isArchived, false),
        pageScope(pagesTable.id, actor)
      )
    )
}

export async function rawRequirePageById(id: string) {
  const [page] = await getDatabase()
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, id))
    .limit(1)
  if (!page) throw new CrudError(404, "page_not_found", "Page not found")
  return page
}
