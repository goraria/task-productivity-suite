"use client"
import { useAuth } from "@/hooks/use-auth"
import type {
  ApiListResponse,
  DatabaseProperty,
  Page,
  PagePropertyValue,
} from "@/lib/productivity"
import {
  productivityKeys,
  type QueryScope,
} from "@/queries/productivity"
import { createQueryService, defineQuery } from "@/utils/caller"
interface Records extends ApiListResponse<Page> {
  properties: DatabaseProperty[]
  values: PagePropertyValue[]
}
const records = createQueryService(
  defineQuery<Records, QueryScope & { databaseId: string }>({
    queryKey: (input) => [
      ...productivityKeys.resource("page"),
      "record",
      input,
    ],
    query: (input) => ({
      url: `/internal/task/database/${input.databaseId}/record`,
      method: "GET",
      params: Object.fromEntries(
        Object.entries(input).filter(
          ([key]) => !["databaseId", "subject", "enabled"].includes(key)
        )
      ),
      unwrapData: false,
    }),
    queryOptions: ({ databaseId, subject }) => ({
      enabled: Boolean(databaseId && subject),
    }),
  })
)
export function useDatabaseRecords(input: QueryScope & { databaseId: string }) {
  return records({ ...input, subject: useAuth().account?.id })
}
