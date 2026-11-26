"use client"
import { useAuth } from "@/hooks/use-auth"
import type { ApiListResponse, Block } from "@/lib/productivity"
import { productivityKeys } from "@/queries/productivity"
import { caller } from "@/utils/caller"
import { useInfiniteQuery } from "@gorth-com/primitive/cores/tanstack/query"
export function useDocumentBlocks(pageId: string) {
  const subject = useAuth().account?.id
  const result = useInfiniteQuery({
    queryKey: [...productivityKeys.resource("block"), { pageId, subject }],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      caller<ApiListResponse<Block>>({
        url: "/internal/task/block",
        method: "GET",
        params: {
          pageId,
          limit: 100,
          offset: pageParam,
          sort: "position",
          direction: "asc",
        },
        unwrapData: false,
      }),
    getNextPageParam: (last) =>
      last.pagination.hasMore
        ? last.pagination.offset + last.pagination.limit
        : undefined,
    enabled: Boolean(pageId && subject),
  })
  return {
    ...result,
    data: result.data
      ? {
          data: result.data.pages.flatMap((page) => page.data),
          pagination: result.data.pages.at(-1)!.pagination,
        }
      : undefined,
  }
}
