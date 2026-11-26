import z from "@gorth-com/structure/cores/zod"
import {
  createInsertSchema,
  createSchemaFactory,
  createUpdateSchema,
} from "drizzle-orm/zod"
import type { AnyPgTable } from "drizzle-orm/pg-core"
import { userTable } from "@/database/schema"

const {
  createInsertSchema: createCoercedInsertSchema,
  createUpdateSchema: createCoercedUpdateSchema,
} = createSchemaFactory({
  zodInstance: z,
  coerce: { date: true },
})

function fieldMask(fields: readonly string[]) {
  return Object.fromEntries(fields.map((field) => [field, true]))
}

export function createCrudSchemas(
  table: AnyPgTable,
  createFields: readonly string[],
  updateFields: readonly string[]
) {
  return {
    insert: createCoercedInsertSchema(table).pick(
      fieldMask(createFields) as never
    ),
    update: createCoercedUpdateSchema(table).pick(
      fieldMask(updateFields) as never
    ),
  }
}

export const authUserSchema = createCoercedInsertSchema(userTable, {
  externalUserId: (schema) => schema.min(1),
  name: (schema) => schema.min(1),
  username: (schema) => schema.min(1).max(64),
  email: (schema) => schema.email(),
})
  .pick({
    externalUserId: true,
    name: true,
    username: true,
    email: true,
    image: true,
    status: true,
  })
  .required({ externalUserId: true, name: true, email: true, status: true })

export { createInsertSchema, createUpdateSchema }
