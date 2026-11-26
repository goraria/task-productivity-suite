import { databaseUrl } from "@/utils/environment"
import postgres from "@gorth-com/structure/cores/postgres"
import { readFile } from "node:fs/promises"
export async function applyTaskMigration() {
  if (!databaseUrl)
    throw new Error("DATABASE_URL is required for cloud verification")
  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    onnotice: () => {},
  })
  try {
    await client.unsafe(
      await readFile(
        new URL(
          "../../database/migrations/20261028-task-productivity.sql",
          import.meta.url
        ),
        "utf8"
      )
    )
  } finally {
    await client.end()
  }
}
