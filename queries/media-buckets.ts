"use client"
import { useAuth } from "@/hooks/use-auth"
import { createQueryService, defineQuery } from "@/utils/caller"
const buckets = createQueryService(
  defineQuery<
    { id: string; name: string; allowedTypes: string[] }[],
    { subject?: string }
  >({
    queryKey: (input) => ["media", "bucket", input.subject],
    query: { url: "/external/media/bucket", method: "GET" },
    queryOptions: (input) => ({ enabled: Boolean(input.subject) }),
  })
)
export function useAttachmentBuckets() {
  return buckets({ subject: useAuth().account?.id })
}
