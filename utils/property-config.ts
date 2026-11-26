export function formulaReferences(expression: unknown): Set<string> {
  const references = new Set<string>()
  let nodes = 0
  function visit(value: unknown, depth: number) {
    if (++nodes > 1000 || depth > 20) throw new Error("Formula is too complex")
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "string" ||
      (typeof value === "number" && Number.isFinite(value))
    )
      return
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid formula expression")
    const node = value as Record<string, unknown>
    if (typeof node.property === "string" && Object.keys(node).length === 1) {
      references.add(node.property)
      return
    }
    if (
      !Array.isArray(node.args) ||
      node.args.length > 100 ||
      Object.keys(node).some((key) => !["op", "args"].includes(key))
    )
      throw new Error("Invalid formula arguments")
    const arities: Record<string, number | null> = {
      add: null,
      multiply: null,
      concat: null,
      subtract: 2,
      divide: 2,
      equal: 2,
      if: 3,
    }
    if (
      typeof node.op !== "string" ||
      !Object.hasOwn(arities, node.op) ||
      (arities[node.op] !== null && node.args.length !== arities[node.op])
    )
      throw new Error("Unsupported formula operation")
    for (const arg of node.args) visit(arg, depth + 1)
  }
  visit(expression, 0)
  return references
}
