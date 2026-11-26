import type { ComponentProps } from "react"
import { LucideIcon } from "@gorth/primitive/cores/lucide"

export interface User {
  id: string
  username: string | null
  email?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export interface AuthUser extends User {}

export type CallerMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type CallerToastConfig =
  | boolean
  | {
      loading?: string
      success?: string
      error?: string
    }

export interface CallerOptions<TData = unknown> {
  url: string
  method?: CallerMethod
  data?: TData
  params?: Record<string, unknown>
  headers?: Record<string, string>
  timeout?: number
  toast?: CallerToastConfig
  withCredentials?: boolean
}

export interface CallerExtraOptions {
  auth?: boolean
  baseURL?: string | null
  unwrapData?: boolean
}

export type CallerConfig<TData = unknown> = CallerOptions<TData> & CallerExtraOptions

export type CallerRequestOptions<TData = unknown> = Omit<
  CallerOptions<TData>,
  "method" | "url"
>

export type CallerRequestConfig<TData = unknown> =
  CallerRequestOptions<TData> & CallerExtraOptions

export interface ApiErrorPayload {
  message?: unknown
  error?: unknown
  errors?: unknown
}

export interface EndpointFetchArgs {
  url: string
  baseUrl?: string | null
  method?: CallerMethod
  body?: unknown
  data?: unknown
  params?: Record<string, unknown>
  headers?: HeadersInit
  timeout?: number
}

export interface EndpointFetchBaseQueryError {
  status: number | "FETCH_ERROR"
  data?: unknown
  error?: string
}

export interface EndpointQueryMeta {
  response?: {
    status: number
  }
}

export interface EndpointQueryReturnValue<TResult, TError> {
  data?: TResult
  error?: TError
  meta?: EndpointQueryMeta
}

export interface EndpointBaseQueryApi {
  signal?: AbortSignal
}

export interface EndpointBaseQueryExtraOptions {
  endpointType?: "query" | "mutation"
}

export type EndpointBaseQueryFn<TArgs, TResult, TError> = (
  args: TArgs,
  api: EndpointBaseQueryApi,
  extraOptions?: EndpointBaseQueryExtraOptions
) => Promise<EndpointQueryReturnValue<TResult, TError>>

export type EndpointQueryArg<TArg> = {
  bivarianceHack: (arg: TArg) => string | EndpointFetchArgs
}["bivarianceHack"]

export type EndpointQueryFn<TResult, TArg> = (
  arg: TArg,
  api: EndpointBaseQueryApi,
  extraOptions: EndpointBaseQueryExtraOptions | undefined,
  baseQuery: EndpointBaseQueryFn<
    string | EndpointFetchArgs,
    unknown,
    EndpointFetchBaseQueryError
  >
) => Promise<EndpointQueryReturnValue<TResult, EndpointFetchBaseQueryError>>

export interface EndpointDefinition<
  TResult = unknown,
  TArg = unknown,
  TType extends "query" | "mutation" = "query",
> {
  type: TType
  query?: EndpointQueryArg<TArg>
  queryFn?: EndpointQueryFn<TResult, TArg>
  transformResponse?: (raw: unknown) => TResult
  transformErrorResponse?: (raw: unknown) => unknown
  providesTags?: unknown
  invalidatesTags?: unknown
}

export type EndpointFunctions<TEndpoints extends Record<string, unknown>> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends EndpointDefinition<
    infer TResult,
    infer TArg,
    "query" | "mutation"
  >
    ? undefined extends TArg
      ? (
          arg?: TArg,
          api?: EndpointBaseQueryApi
        ) => Promise<
          EndpointQueryReturnValue<TResult, EndpointFetchBaseQueryError>
        >
      : (
          arg: TArg,
          api?: EndpointBaseQueryApi
        ) => Promise<
          EndpointQueryReturnValue<TResult, EndpointFetchBaseQueryError>
        >
    : never
}

export interface EndpointHookOptions {
  skip?: boolean
}

export interface EndpointHookResult<TResult, TArg> {
  data: TResult | null
  error: EndpointFetchBaseQueryError | null
  loading: boolean
  result: EndpointQueryReturnValue<TResult, EndpointFetchBaseQueryError> | null
  meta?: EndpointQueryMeta
  refresh: (
    arg?: TArg
  ) => Promise<EndpointQueryReturnValue<TResult, EndpointFetchBaseQueryError>>
}

export type EndpointHookFunctions<TEndpoints extends Record<string, unknown>> = {
  [K in keyof TEndpoints]: TEndpoints[K] extends EndpointDefinition<
    infer TResult,
    infer TArg,
    "query" | "mutation"
  >
    ? undefined extends TArg
      ? (
          arg?: TArg,
          options?: EndpointHookOptions
        ) => EndpointHookResult<TResult, TArg>
      : (
          arg: TArg,
          options?: EndpointHookOptions
        ) => EndpointHookResult<TResult, TArg>
    : never
}

export interface EndpointBuilder {
  query<TResult, TArg>(
    definition: Omit<EndpointDefinition<TResult, TArg, "query">, "type">
  ): EndpointDefinition<TResult, TArg, "query">
  mutation<TResult, TArg>(
    definition: Omit<EndpointDefinition<TResult, TArg, "mutation">, "type">
  ): EndpointDefinition<TResult, TArg, "mutation">
}

export interface CreateEndpointConfig<TEndpoints extends Record<string, unknown>> {
  baseQuery: EndpointBaseQueryFn<
    string | EndpointFetchArgs,
    unknown,
    EndpointFetchBaseQueryError
  >
  reducerPath?: string
  tagTypes?: string[]
  endpoints: (builder: EndpointBuilder) => TEndpoints
}

export interface EndpointFetchBaseQueryConfig {
  baseUrl?: string
  prepareHeaders?: (headers: Headers) => Promise<Headers> | Headers
}

export interface EndpointApiResponseEnvelope<TData = unknown> {
  data?: TData
  message?: string
}

export interface DemoApiRequest {
  params?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
  data?: unknown
  headers?: Record<string, string>
  timeout?: number
}

export interface DemoApiData {
  id: string
  source: string
  route: string
  url: string
  method: string
  status: "ok"
  generatedAt: string
  params: Record<string, string>
  body: unknown
  headers: Record<string, string>
  cookieNames: string[]
  hasAuthorization: boolean
}

export interface ParamRequest {
  id: string
}

export interface QueryRequest {
  q: string
}

export interface AuthContextValue {
  account: AuthUser | null
  loading: boolean
  authenticated: boolean
  refresh: () => Promise<AuthUser | null>
  login: (returnTo?: string) => void
  register: (returnTo?: string) => void
  logout: (returnTo?: string) => Promise<void>
}

export interface AuthMeResponse {
  user?: AuthUser | null
  gorth_app?: Record<string, unknown>
  error?: string
}

export interface SsoExchangeResponse {
  user?: AuthUser | null
  sso_sub?: string
  email?: string
  access_token?: string
  refresh_token?: string
  id_token?: string
  gorth_app?: Record<string, unknown>
  error?: string
}

export interface SubscribeButtonProps {
  defaultSubscribed?: boolean
  isSubscribed?: boolean
  className?: string
  onSubscribedChange?: (subscribed: boolean) => void
  onNotificationChange?: (value: "all" | "personalized" | "none") => void
}

export interface MembershipButtonProps {
  channelName?: string
  className?: string
}

export interface CommunityButtonProps {
  channelSlug: string
  className?: string
}

export interface SettingPageProps {
  params: Promise<{
    slug?: string[]
  }>
}

export type VideoLayout = "below" | "overlay" | "side"
export type VideoSize = "sm" | "md" | "lg" | "auto"
export type MetadataPosition = "below" | "left" | "right" | "top"

export interface VideoProps
  extends Omit<ComponentProps<"article">, "title"> {
  video?: Video
  channel?: Channel
  layout?: VideoLayout
  size?: VideoSize
  metadataPosition?: MetadataPosition
  contentClassName?: string
}

export interface SuggestionItem {
  video: {
    id: string
    thumbnail: string
    title: string
    publishedAt: string
    duration: string
  }
  channel: {
    name: string
    slug: string
    avatar: string
  }
}

export type CategoryDataColumn = Record<string, unknown>
export type IngredientDataColumn = Record<string, unknown>
export type MenuDataColumn = Record<string, unknown>
export type MenuItemDataColumn = Record<string, unknown>
export type RecipeDataColumn = Record<string, unknown>
export type ReservationDataColumn = Record<string, unknown>
export type ReservationStatus = string
export type TableDataColumn = Record<string, unknown>
export type Cart = Record<string, unknown>
export type CartItem = Record<string, unknown>
export type CartWithItems = Cart & { items?: CartItem[] }

// =============================================================================
// =============================================================================
// =============================================================================

export interface Channel {
  id?: string
  name?: string
  handle?: string
  avatar?: string
  subscribers?: number,
  videos?: number,
  description?: string,
  links?: [
    { title: "Waddles.com", href: "waddles.com" },
    { title: "Subscribe here!", href: "youtube.com/@waddles?sub_confirmation=1" },
    { title: "Waddles Facebook", href: "facebook.com/waddles" },
    { title: "Waddles Instagram", href: "instagram.com/waddles" },
    { title: "Waddles TikTok", href: "tiktok.com/@waddles" },
  ],
  url?: string,
  location?: string,
  joined?: Date,
  views?: number,
}

export interface Video {
  id?: string | undefined
  thumbnail: string
  title: string
  duration?: string
  publishedAt?: string
  description?: string
}


// =============================================================================

export interface FeedStatisticProps {
  title?: string
  description?: string | number
  icon: LucideIcon
  color?: "default" | "secondary" | "destructive" | "outline" | "danger" | "warning" | "info" | "success" | "primary-1" | "primary-2" | "primary-3" | "primary-4" | "primary-5"
}
