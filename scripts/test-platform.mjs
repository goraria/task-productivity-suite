import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
const repositories = [
  "notification-center",
  "resource-interaction",
  "discovery-engine",
  "payment-gateway",
  "billing-subscription",
  "media-storage",
  "insight-governance",
]
const failures = []
for (const repository of repositories) {
  console.log(`Testing ${repository}`)
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--configLoader",
      "native",
      "--no-cache",
      "--no-fsModuleCache",
    ],
    {
      cwd: fileURLToPath(new URL(`../../${repository}/`, import.meta.url)),
      stdio: "inherit",
    }
  )
  if (result.status !== 0) failures.push(repository)
}
if (failures.length) {
  console.error("Failed services:", failures.join(", "))
  process.exitCode = 1
}
