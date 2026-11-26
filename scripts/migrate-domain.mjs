import nextEnv from "@next/env"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import postgres from "@gorth-com/structure/cores/postgres"
nextEnv.loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)), true)
const { databaseUrl } = await import("../utils/environment.ts")
if (!databaseUrl) throw new Error("DATABASE_URL is required")
const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    onnotice() { },
})
try {
    await client.unsafe(
        await readFile(
            new URL(
                "../database/migrations/20261028-task-productivity.sql",
                import.meta.url
            ),
            "utf8"
        )
    )
    console.log(
        "Task domain migration applied; authentication schema was not modified."
    )
} catch {
    console.error(
        "Task domain migration failed; inspect the migration and database access."
    )
    process.exitCode = 1
} finally {
    await client.end()
}
