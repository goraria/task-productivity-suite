import nextEnv from "@next/env"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
const root = fileURLToPath(new URL("../", import.meta.url))
// Load before Vitest sets NODE_ENV=test (Next intentionally skips .env.local then).
// Values stay in the process environment and are never printed.
nextEnv.loadEnvConfig(root, true)
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/vitest/vitest.mjs", import.meta.url)
    ),
    "run",
    "--config",
    "vitest.database.config.ts",
    "--configLoader",
    "native",
    "--no-cache",
    "--no-fsModuleCache",
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: "inherit" }
)
process.exitCode = result.status ?? 1
