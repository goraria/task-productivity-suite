import { readFile, realpath } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"
import { expect, it } from "vitest"

it("compiles Task/Primitive CSS in process without watching Next output or pkg", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url))
  const from = path.join(root, "styles/globals.css")
  const result = await postcss([tailwindcss()]).process(
    await readFile(from, "utf8"),
    { from }
  )
  const paths = result.messages.flatMap((message) =>
    message.type === "dir-dependency"
      ? [String(message.dir)]
      : message.type === "dependency"
        ? [String(message.file)]
        : []
  )
  expect(paths).not.toContain(path.resolve(root))
  for (const entry of paths) {
    expect(entry.startsWith(path.join(root, ".next"))).toBe(false)
    expect(entry.startsWith(path.join(root, "pkg"))).toBe(false)
  }
  expect(result.css).toContain(".h-9")
  expect(result.css).toContain(".size-9")
  const primitiveComponents = await realpath(
    path.join(root, "node_modules/@gorth-com/primitive/src/components")
  )
  expect(paths.some((entry) => entry.startsWith(primitiveComponents))).toBe(
    true
  )
})
