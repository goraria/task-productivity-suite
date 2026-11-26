import { createBrowserClient } from "@gorth/structure/cores/supabase/ssr"
import { supabaseAnonKey, supabaseUrl } from "@/utils/environment"

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
