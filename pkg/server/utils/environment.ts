import dotenv from "dotenv"

dotenv.config({
  path: ".env.local",
  override: false,
  debug: false,
  quiet: true,
})

export const nodeEnv = process.env.NODE_ENV
export const isProduction = nodeEnv === "production"
export const port = process.env.VITE_PUBLIC_PORT
export const serverUrl = process.env.VITE_PUBLIC_SERVER_URL
export const clientUrl = process.env.VITE_PUBLIC_CLIENT_URL
export const mobileUrl = process.env.VITE_PUBLIC_MOBILE_URL
export const authUrl = process.env.VITE_PUBLIC_AUTH_URL
export const ssoClientUrl = process.env.VITE_PUBLIC_SSO_CLIENT_URL
export const ssoServerUrl = process.env.VITE_PUBLIC_SSO_SERVER_URL
export const ssoOAuthClientId = process.env.VITE_PUBLIC_SSO_OAUTH_CLIENT_ID
export const authSecret = process.env.VITE_AUTH_SECRET
export const sessionSecret = process.env.VITE_SESSION_SECRET
export const accessTokenCookie = process.env.GORTH_ACCESS_TOKEN!
export const databaseUrl = process.env.DATABASE_URL
export const pgPoolMax = process.env.PG_POOL_MAX
export const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL
export const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY
export const supabasePublishableKey =
  process.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
export const supabasePublishableOrAnonKey =
  process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY
export const supabasePublishableDefaultKey =
  process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY
export const supabaseDirectUrl = process.env.SUPABASE_DIRECT_URL
export const csrfEnabled = process.env.CSRF_ENABLED === "true"
export const csrfSecret = process.env.CSRF_SECRET
export const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === "true"

export function getCorsOrigins(): string[] {
  return [clientUrl, mobileUrl].filter(
    (origin): origin is string => Boolean(origin)
  )
}
export const oauthReadScope = "task:read"
export const oauthWriteScope = "task:write"
