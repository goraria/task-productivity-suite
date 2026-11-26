import { defineConfig } from "drizzle-kit"
import { databaseUrl } from "@/utils/environment"

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

export default defineConfig({
  out: "./database/drizzle",
  schema: "./database/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
})
