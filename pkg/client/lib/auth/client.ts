"use client"

import { me } from "@/services/auth"

let refreshRequest: Promise<boolean> | null = null

export function refreshAuthentication() {
  if (refreshRequest) return refreshRequest

  refreshRequest = me()
    .then(Boolean)
    .catch(() => false)
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

export async function withAuthRetry<T>(
  request: () => Promise<T>,
  getStatus: (error: unknown) => number | undefined,
  enabled = true
) {
  try {
    return await request()
  } catch (error) {
    if (!enabled || getStatus(error) !== 401) throw error

    const refreshed = await refreshAuthentication()
    if (!refreshed) throw error

    return request()
  }
}
