"use client"

import { createQueryService, defineQuery } from "@/utils/caller"

export interface LocalUser {
  id: string
  externalUserId?: string
  name: string
  username: string | null
  email: string
  image: string | null
  role?: string
  status: "active" | "inactive" | "suspended" | "deleted"
  syncedAt: string
  [key: string]: unknown
}

export interface CurrentUserQueryInput {
  enabled: boolean
  userId?: string
}

export const currentUserQueryKey = ["user", "current"] as const

const currentUserService = defineQuery<LocalUser, CurrentUserQueryInput>({
  queryKey: ({ userId }) => [...currentUserQueryKey, userId] as const,
  query: {
    url: "/internal/task/user/me",
    method: "GET",
  },
  queryOptions: ({ enabled, userId }) => ({
    enabled: enabled && Boolean(userId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  }),
})

export const useCurrentUserQuery = createQueryService(currentUserService)
