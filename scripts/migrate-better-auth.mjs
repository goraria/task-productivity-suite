import { readFile } from "node:fs/promises"
import nextEnv from "@next/env"
import postgres from "@gorth-com/structure/cores/postgres"

nextEnv.loadEnvConfig(process.cwd())
const { databaseUrl } = await import("../utils/environment.ts")
if (!databaseUrl) throw new Error("DATABASE_URL is required")
const database = postgres(databaseUrl, { max: 1, prepare: false })
async function domainSnapshot(transaction) {
    return transaction.unsafe(
        'SELECT (SELECT count(*) FROM public."workspace") AS "workspace", (SELECT count(*) FROM public."workspace_member") AS "workspace_member", (SELECT count(*) FROM public."database") AS "database", (SELECT count(*) FROM public."page") AS "page", (SELECT count(*) FROM public."block") AS "block", (SELECT count(*) FROM public."database_property") AS "database_property", (SELECT count(*) FROM public."page_property_value") AS "page_property_value", (SELECT count(*) FROM public."database_view") AS "database_view", (SELECT count(*) FROM public."permission") AS "permission", (SELECT count(*) FROM public."file") AS "file", (SELECT count(*) FROM public."rate_limit") AS "rate_limit"'
    )
}

try {
    const migration = await readFile(
        new URL("../database/migrations/20261011-better-auth.sql", import.meta.url),
        "utf8"
    )
    const result = await database.begin(async (transaction) => {
        await transaction`SELECT pg_advisory_xact_lock(hashtextextended('gorth:better-auth-migration', 0))`
        const before = await transaction`SELECT id FROM public."user" ORDER BY id`
        const domainBefore = await domainSnapshot(transaction)
        await transaction.unsafe(migration)
        const after = await transaction`SELECT id FROM public."user" ORDER BY id`
        if (JSON.stringify(before) !== JSON.stringify(after))
            throw new Error("User identities changed; rollback")
        const missing =
            await transaction`SELECT count(*)::int AS count FROM public."user" u
      WHERE NOT EXISTS (SELECT 1 FROM public.account a WHERE a.user_id = u.id AND a.provider_id = 'gorth' AND a.account_id = u.external_user_id)`
        if (missing[0].count !== 0)
            throw new Error("Account bindings are incomplete; rollback")
        const domainAfter = await domainSnapshot(transaction)
        if (JSON.stringify(domainBefore) !== JSON.stringify(domainAfter))
            throw new Error("Task data changed; rollback")
        return {
            usersPreserved: after.length,
            accountBindingsVerified: true,
            taskDataPreserved: true,
        }
    })
    console.log(JSON.stringify(result))
} catch {
    console.error(
        "Migration failed; transaction rolled back. No credentials logged."
    )
    process.exitCode = 1
} finally {
    await database.end()
}
