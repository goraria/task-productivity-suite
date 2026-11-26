// CLI configuration only; Next.js loads application env itself.
// Load before importing utils/environment so exported constants see root env.
import nextEnv from "@next/env"

nextEnv.loadEnvConfig(process.cwd())
