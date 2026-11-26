import { registerVercelTelemetry } from "@gorth-com/principle/configs/vercel"
import { vercelTelemetryEnabled } from "@/utils/environment"

export function register() {
  registerVercelTelemetry("task-productivity-suite", vercelTelemetryEnabled)
}
