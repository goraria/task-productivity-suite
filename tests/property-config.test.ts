import { parsePropertyValue } from "@/schemas/productivity"
import { formulaReferences } from "@/utils/property-config"
import { describe, expect, it } from "vitest"
describe("bounded property configuration", () => {
  it("collects references from nested supported expressions", () => {
    expect([
      ...formulaReferences({
        op: "if",
        args: [true, { property: "amount" }, 0],
      }),
    ]).toEqual(["amount"])
  })
  it.each([
    [],
    undefined,
    Infinity,
    { op: "constructor", args: [] },
    { op: "divide", args: [1] },
    { property: "id", script: "eval" },
  ])("rejects malformed formulas %j", (expression) => {
    expect(() => formulaReferences(expression)).toThrow()
  })
  it("rejects excessive nesting", () => {
    let value: unknown = 1
    for (let i = 0; i < 22; i++) value = { op: "add", args: [value] }
    expect(() => formulaReferences(value)).toThrow()
  })
  it("validates selected options and removes duplicates", () => {
    expect(
      parsePropertyValue("multi_select", ["one", "one"], { options: ["one"] })
    ).toEqual(["one"])
    expect(() =>
      parsePropertyValue("multi_select", ["two"], { options: ["one"] })
    ).toThrow()
  })
})
