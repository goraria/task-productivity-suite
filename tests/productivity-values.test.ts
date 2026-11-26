import {
  parsePropertyValue,
  safeUrlSchema,
  validatePermission,
} from "@/schemas/productivity"
import { canTransition, sprintSchema } from "@/schemas/work-management"
import { evaluateFormula, rollupValues } from "@/utils/database-properties"
import {
  moveBlockIds,
  safeContentUrl,
  updateBlockContent,
} from "@/utils/editor"
import { expect, it } from "vitest"

it("updates todo text without erasing checked state or metadata", () => {
  expect(
    updateBlockContent(
      { text: "old", checked: true, color: "blue" },
      { text: "new" }
    )
  ).toEqual({ text: "new", checked: true, color: "blue" })
})
it("moves blocks without duplicating IDs or accepting out-of-range positions", () => {
  expect(moveBlockIds(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"])
  expect(moveBlockIds(["a", "b"], "a", -1)).toEqual(["a", "b"])
})
it.each([
  "javascript:alert(1)",
  "data:text/html,test",
  "https://user:password@example.com",
  "file:///tmp/test",
  "//example.com",
])("rejects unsafe content URL %s", (value) => {
  expect(safeContentUrl(value)).toBeNull()
  expect(safeUrlSchema.safeParse(value).success).toBe(false)
})
it("validates property types rather than storing every value as text", () => {
  expect(parsePropertyValue("number", { value: 12 })).toBe(12)
  expect(() => parsePropertyValue("number", "12")).toThrow()
  expect(() => parsePropertyValue("checkbox", "false")).toThrow()
  expect(parsePropertyValue("checkbox", false)).toBe(false)
  expect(() =>
    parsePropertyValue("select", "unregistered", { options: ["todo"] })
  ).toThrow()
  expect(() => parsePropertyValue("formula", 12)).toThrow(
    "computed_property_readonly"
  )
})
it("public grants are read-only and grants must identify one target", () => {
  const pageId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  expect(() =>
    validatePermission({ pageId, subjectType: "public", level: "edit" })
  ).toThrow()
  expect(() =>
    validatePermission({
      subjectType: "user",
      subjectId: pageId,
      level: "edit",
    })
  ).toThrow()
  expect(
    validatePermission({ pageId, subjectType: "public", level: "view" }).level
  ).toBe("view")
})
it("evaluates bounded formulas without evaluating JavaScript", () => {
  expect(
    evaluateFormula({ op: "add", args: [{ property: "n" }, 2] }, { n: 3 })
  ).toBe(5)
  expect(evaluateFormula({ op: "divide", args: [1, 0] }, {})).toBeNull()
  expect(evaluateFormula({ op: "concat", args: ["a", "b"] }, {})).toBe("ab")
  expect(
    evaluateFormula(
      { op: "if", args: [{ op: "equal", args: [2, 2] }, "yes", "no"] },
      {}
    )
  ).toBe("yes")
  expect(() => evaluateFormula({}, {}, 21)).toThrow("formula_depth_exceeded")
  expect(rollupValues([2, 4, "x"], "average")).toBe(3)
})
it("validates workflow transitions and sprint date ordering", () => {
  expect(canTransition("backlog", "done")).toBe(false)
  expect(canTransition("review", "done")).toBe(true)
  expect(canTransition("done", "todo")).toBe(true)
  expect(
    sprintSchema.safeParse({
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Sprint",
      startsAt: "2026-10-30",
      endsAt: "2026-10-29",
    }).success
  ).toBe(false)
})
