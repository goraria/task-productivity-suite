"use client"
import { useAuth } from "@/hooks/use-auth"
import { productivityKeys } from "@/queries/productivity"
import {
  createMutationService,
  createQueryService,
  defineMutation,
  defineQuery,
} from "@/utils/caller"
export interface Issue {
  pageId: string
  workspaceId: string
  number: number
  title: string
  version: number
  status: string
  priority: string
  kind: string
  assigneeId: string | null
  sprintId: string | null
  estimate: number | null
  dueAt: string | null
}
export interface Sprint {
  id: string
  name: string
  status: string
  goal: string | null
}
const issues = createQueryService(
  defineQuery<
    { data: Issue[]; pagination: { total: number } },
    {
      workspaceId: string
      limit: number
      offset: number
      search?: string
      status?: string
      subject?: string
    }
  >({
    queryKey: (input) => ["task-issue", input],
    query: (input) => ({
      url: "/internal/task/issue",
      method: "GET",
      params: Object.fromEntries(
        Object.entries(input).filter(([key]) => key !== "subject")
      ),
      unwrapData: false,
    }),
    queryOptions: (input) => ({
      enabled: Boolean(input.workspaceId && input.subject),
    }),
  })
)
export function useIssues(input: {
  workspaceId: string
  limit: number
  offset: number
  search?: string
  status?: string
}) {
  return issues({ ...input, subject: useAuth().account?.id })
}
export const useCreateIssue = createMutationService(
  defineMutation<
    Issue,
    {
      workspaceId: string
      title: string
      kind: string
      priority: string
      assigneeId?: string | null
      sprintId?: string | null
      estimate?: number
      dueAt?: string
    }
  >({
    query: (body) => ({ url: "/internal/task/issue", method: "POST", body }),
    invalidates: [["task-issue"], productivityKeys.resource("page")],
  })
)
export const useUpdateIssue = createMutationService(
  defineMutation<
    Issue,
    {
      id: string
      version: number
      status?: string
      priority?: string
      assigneeId?: string | null
      sprintId?: string | null
      estimate?: number | null
      dueAt?: string | null
    }
  >({
    query: ({ id, ...body }) => ({
      url: `/internal/task/issue/${id}`,
      method: "PATCH",
      body,
    }),
    invalidates: [["task-issue"], productivityKeys.resource("page")],
  })
)
