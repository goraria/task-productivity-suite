import { getDatabase } from "@/database"
import { databaseScope, assertAccess } from "@/database/authorization"
import { createCrudRepository, CrudError, crudKey, type CrudActor, type CrudListOptions } from "@/database/crud"
import { databasePropertiesTable } from "@/database/schema"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"
import { formulaReferences } from "@/utils/property-config"
import { eq } from "drizzle-orm"
import { propertyConfigSchema } from "@/schemas/productivity"
import { rawCreatePropertyQuery } from "@/models/page"
import { randomUUID } from "node:crypto"
import "server-only"

const repository = createCrudRepository(
  "database property",
  {
    table: databasePropertiesTable,
    keys: [crudKey("id", databasePropertiesTable.id)],
    createFields: [
      "workspaceId",
      "databaseId",
      "name",
      "type",
      "config",
      "position",
    ],
    updateFields: ["name", "type", "config", "position"],
    orderBy: databasePropertiesTable.updatedAt,
    touchUpdatedAt: true,
    filters: ["workspaceId", "pageId", "databaseId"],
  },
  {
    readScope: (actor) =>
      databaseScope(databasePropertiesTable.databaseId, actor),
    writeScope: (actor) =>
      databaseScope(databasePropertiesTable.databaseId, actor, "edit"),
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view"),
    create: async (payload, actor) => {
      await rawAssertTargetAccess(payload, actor, "edit")
      await rawValidateReferences(payload, actor)
      await rawValidatePropertyConfiguration(payload, actor)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "edit"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      await rawValidatePropertyConfiguration({ ...row, ...payload }, actor)
    },
  }
)

export async function rawListDatabaseProperties(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetDatabaseProperty(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateDatabaseProperty(actor: CrudActor, input: unknown) {
  try {
    return (await repository.create(
      actor,
      input
    )) as typeof databasePropertiesTable.$inferSelect
  } catch (error) {
    throw error
  }
}
export async function rawUpdateDatabaseProperty(
  actor: CrudActor,
  params: Record<string, string | undefined>,
  input: unknown
) {
  try {
    return await repository.update(actor, params, input)
  } catch (error) {
    throw error
  }
}
export async function rawDeleteDatabaseProperty(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    const property = await repository.get(actor, params)
    const peers = await getDatabase()
      .select()
      .from(databasePropertiesTable)
      .where(
        eq(databasePropertiesTable.workspaceId, String(property.workspaceId))
      )
    for (const peer of peers) {
      if (peer.id === property.id) continue
      const config = peer.config as Record<string, unknown>
      if (
        (peer.type === "formula" &&
          formulaReferences(config.expression).has(String(property.id))) ||
        (peer.type === "rollup" &&
          (config.relationPropertyId === property.id ||
            config.targetPropertyId === property.id))
      )
        throw new CrudError(
          409,
          "property_in_use",
          "Update dependent formulas and rollups before removing this property"
        )
    }
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}

export async function rawValidatePropertyConfiguration(
  payload: Record<string, unknown>,
  actor: CrudActor
) {
  const config = propertyConfigSchema.parse(payload.config ?? {})
  const rows = await getDatabase()
    .select()
    .from(databasePropertiesTable)
    .where(eq(databasePropertiesTable.databaseId, String(payload.databaseId)))
  const candidate = {
    ...payload,
    id: payload.id ?? randomUUID(),
    config,
  } as typeof databasePropertiesTable.$inferSelect
  const properties = [
    ...rows.filter((row) => row.id !== candidate.id),
    candidate,
  ]
  try {
    for (const property of properties) {
      const settings = property.config as Record<string, unknown>
      if (property.type === "formula") {
        for (const id of formulaReferences(settings.expression))
          if (!properties.some((row) => row.id === id))
            throw new Error("Formula references an unknown property")
      }
      if (property.type === "rollup") {
        if (
          !["count", "sum", "average", "minimum", "maximum"].includes(
            String(settings.operation)
          )
        )
          throw new Error("Choose a supported aggregation")
        if (
          !properties.some(
            (row) =>
              row.id === settings.relationPropertyId && row.type === "relation"
          )
        )
          throw new Error("Choose a relation property")
        const [storedTarget] = await getDatabase()
          .select()
          .from(databasePropertiesTable)
          .where(
            eq(databasePropertiesTable.id, String(settings.targetPropertyId))
          )
          .limit(1)
        const target =
          settings.targetPropertyId === candidate.id ? candidate : storedTarget
        if (
          !target ||
          target.workspaceId !== payload.workspaceId ||
          (settings.operation !== "count" && target.type !== "number")
        )
          throw new Error(
            "Numeric aggregations require a stored Number property in the same workspace"
          )
        await assertAccess("database", target.databaseId, actor)
      }
      if (["select", "multi_select", "status"].includes(property.type)) {
        if (
          !Array.isArray(settings.options) ||
          settings.options.length > 100 ||
          settings.options.some(
            (option) =>
              typeof option !== "string" ||
              !option.trim() ||
              option.length > 255
          ) ||
          new Set(settings.options).size !== settings.options.length
        )
          throw new Error("Choose up to 100 distinct nonempty options")
      }
    }
    const query = rawCreatePropertyQuery(properties, actor)
    for (const property of properties)
      if (property.type === "formula" || property.type === "rollup")
        query(property.id)
  } catch (cause) {
    if (cause instanceof CrudError) throw cause
    throw new CrudError(
      400,
      "invalid_property_configuration",
      cause instanceof Error ? cause.message : "Invalid property configuration"
    )
  }
}
