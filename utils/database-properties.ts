export interface FormulaExpression {
  op?: "add" | "subtract" | "multiply" | "divide" | "concat" | "if" | "equal"
  args?: unknown[]
  property?: string
}
// A bounded JSON expression interpreter. No eval, Function, JS source, or network.
export function evaluateFormula(
  expression: unknown,
  values: Record<string, unknown>,
  depth = 0
): unknown {
  if (depth > 20) throw new Error("formula_depth_exceeded")
  if (typeof expression !== "object" || expression === null) return expression
  const node = expression as FormulaExpression
  if (node.property)
    return Object.hasOwn(values, node.property)
      ? (values[node.property] ?? null)
      : null
  if (!Array.isArray(node.args) || node.args.length > 100) return null
  const args = (node.args ?? []).map((value) =>
    evaluateFormula(value, values, depth + 1)
  )
  if (node.op === "concat")
    return args
      .map((value) => String(value ?? ""))
      .join("")
      .slice(0, 10000)
  if (node.op === "equal") return args[0] === args[1]
  if (node.op === "if") return args[0] === true ? args[1] : args[2]
  if (
    !args.every((value) => typeof value === "number" && Number.isFinite(value))
  )
    return null
  const numbers = args as number[]
  const result =
    node.op === "add"
      ? numbers.reduce((a, b) => a + b, 0)
      : node.op === "multiply"
        ? numbers.reduce((a, b) => a * b, 1)
        : node.op === "subtract"
          ? (numbers[0] ?? 0) - (numbers[1] ?? 0)
          : node.op === "divide"
            ? (numbers[0] ?? 0) / (numbers[1] ?? 0)
            : null
  return result !== null && Number.isFinite(result) ? result : null
}

export function rollupValues(values: unknown[], operation: string) {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )
  if (operation === "count") return values.length
  if (operation === "sum") return numbers.reduce((a, b) => a + b, 0)
  if (operation === "average")
    return numbers.length
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : null
  if (operation === "minimum")
    return numbers.length ? Math.min(...numbers) : null
  if (operation === "maximum")
    return numbers.length ? Math.max(...numbers) : null
  return [...new Set(values.map((value) => String(value ?? "")))].join(", ")
}

export function unwrapPropertyValue(value: unknown): unknown {
  return value && typeof value === "object" && "value" in value
    ? (value as { value: unknown }).value
    : value
}
