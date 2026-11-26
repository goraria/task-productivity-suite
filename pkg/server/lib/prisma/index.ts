import dotenv from "dotenv"

import { supabaseDirectUrl } from "@/utils/environment"

dotenv.config({
  override: false,
  debug: false,
  quiet: true,
})

export const connectionString = supabaseDirectUrl ?? ""
