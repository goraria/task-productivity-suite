import { createBrowserClient } from "@gorth/structure/cores/supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "@/utils/environment"

export function createPermission() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
