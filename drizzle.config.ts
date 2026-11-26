import "@/configs/environment"
import { defineConfig } from "drizzle-kit"
import { databaseUrl } from "@/utils/environment"

export default defineConfig({
  schema: "./database/schema.ts",
  out: "./database/drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
})
