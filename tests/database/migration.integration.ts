import { databaseUrl } from "@/utils/environment"
import postgres from "@gorth-com/structure/cores/postgres"
import { readFile } from "node:fs/promises"
import { expect, it } from "vitest"

it("applies the reviewed Task domain migration without modifying authentication", async () => {
  if (!databaseUrl)
    throw new Error(
      "DATABASE_URL is required for the explicitly requested cloud migration"
    )
  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    onnotice: () => {},
  })
  try {
    const before =
      await client`select table_name,column_name,data_type from information_schema.columns where table_schema='public' and table_name in ('user','session','account','verification') order by table_name,ordinal_position`
    const migration = await readFile(
      new URL(
        "../../database/migrations/20261028-task-productivity.sql",
        import.meta.url
      ),
      "utf8"
    )
    await client.unsafe(migration)
    const after =
      await client`select table_name,column_name,data_type from information_schema.columns where table_schema='public' and table_name in ('user','session','account','verification') order by table_name,ordinal_position`
    expect(after).toEqual(before)
    const columns =
      await client`select column_name from information_schema.columns where table_name='page' and column_name='version'`
    expect(columns).toHaveLength(1)
  } finally {
    await client.end()
  }
})
