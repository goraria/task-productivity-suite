import { CrudError } from "@/database/crud"
import type { FormulaExpression } from "@/utils/database-properties"
import { sql, type SQL } from "drizzle-orm"
import "server-only"

export function formulaQuery(
  expression: unknown,
  property: (id: string) => SQL,
  depth = 0
): SQL {
  if (depth > 20)
    throw new CrudError(
      400,
      "formula_depth_exceeded",
      "Formula is too deeply nested"
    )
  if (expression === null || typeof expression !== "object")
    return sql`${JSON.stringify(expression ?? null)}::jsonb`
  const node = expression as FormulaExpression
  if (node.property) return property(node.property)
  if (!Array.isArray(node.args) || node.args.length > 100)
    throw new CrudError(400, "invalid_formula", "Invalid formula arguments")
  const args = node.args.map((value) =>
    formulaQuery(value, property, depth + 1)
  )
  if (node.op === "if" && args.length === 3)
    return sql`case when ${args[0]} = 'true'::jsonb then ${args[1]} else ${args[2]} end`
  if (node.op === "equal" && args.length === 2)
    return sql`to_jsonb(${args[0]} = ${args[1]})`
  if (node.op === "concat")
    return args.length
      ? sql`to_jsonb(concat(${sql.join(
          args.map((arg) => sql`coalesce(${arg} #>> '{}','')`),
          sql`, `
        )}))`
      : sql`'""'::jsonb`
  const number = (arg: SQL) =>
    sql`(case when jsonb_typeof(${arg}) = 'number' then (${arg} #>> '{}')::numeric end)`
  if (node.op === "add" || node.op === "multiply") {
    if (!args.length)
      return sql`to_jsonb(${node.op === "add" ? 0 : 1}::numeric)`
    return sql`to_jsonb(${sql.join(args.map(number), node.op === "add" ? sql` + ` : sql` * `)})`
  }
  if (node.op === "subtract" && args.length === 2)
    return sql`to_jsonb(${number(args[0]!)} - ${number(args[1]!)})`
  if (node.op === "divide" && args.length === 2)
    return sql`to_jsonb(${number(args[0]!)} / nullif(${number(args[1]!)},0))`
  throw new CrudError(400, "invalid_formula", "Unsupported formula operation")
}
