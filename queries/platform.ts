"use client"
import { useAuth } from "@/hooks/use-auth"
import {
  caller,
  createQueryService,
  defineQuery,
} from "@/utils/caller"

interface PlatformInput {
  url: string
  params?: Record<string, string | number | boolean>
  subject?: string
  enabled?: boolean
}
const query = createQueryService(
  defineQuery<unknown, PlatformInput>({
    queryKey: (input) => [
      "task-platform",
      input.url,
      input.subject,
      input.params,
    ],
    query: ({ url, params }) => ({
      url,
      method: "GET",
      params,
      unwrapData: false,
    }),
    queryOptions: ({ subject, enabled }) => ({
      enabled: Boolean(subject) && enabled !== false,
      retry: false,
    }),
  })
)
export function usePlatformQuery<T>(
  url: string,
  params?: PlatformInput["params"],
  enabled = true
) {
  const result = query({ url, params, subject: useAuth().account?.id, enabled })
  return { ...result, data: result.data as T | undefined }
}
export function platformMutation<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST",
  params?: Record<string, unknown>
) {
  return caller<T>({ url, method, body, params, unwrapData: false })
}
