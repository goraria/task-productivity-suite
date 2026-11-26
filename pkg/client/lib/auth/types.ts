export interface AuthUser {
  id: string
  name: string
  username: string | null
  image: string | null
  aud: "authenticated"
  email: string
  email_confirmed_at: string | null
  confirmed_at: string | null
  phone: string | null
  role: "authenticated"
  updated_at: string | null
  created_at: string | null
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}

export interface AuthMeResponse {
  user?: AuthUser | null
  gorth_app?: Record<string, unknown>
  logout_url?: string | null
  error?: string
}

export interface AuthContextValue {
  account: AuthUser | null
  loading: boolean
  error: Error | null
  authenticated: boolean
  refresh: () => Promise<AuthUser | null>
  login: (returnTo?: string) => void
  register: (returnTo?: string) => void
  logout: (returnTo?: string) => Promise<void>
}

export interface OAuthTokenResponse {
  access_token?: string
  refresh_token?: string
  id_token?: string
  token_type?: string
  expires_in?: number
  expires_at?: number
  refresh_token_expires_in?: number
  scope?: string
}

export interface SsoExchangeResponse extends OAuthTokenResponse {
  user: AuthUser
  sso_sub: string
  email: string
  gorth_app: Record<string, unknown>
}
