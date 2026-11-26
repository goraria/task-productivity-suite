"use client"
import type { WorkspaceDirectory } from "@/components/productivity/member-management"
import { useWorkspace } from "@/providers/workspace"
import { issueStatuses } from "@/schemas/work-management"
import { platformMutation, usePlatformQuery } from "@/queries/platform"
import {
  useCreateIssue,
  useIssues,
  useUpdateIssue,
  type Issue,
  type Sprint,
} from "@/queries/work-management"
import { Button } from "@gorth-com/primitive/custom/button"
import { DataTable } from "@gorth-com/primitive/custom/data-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import Link from "next/link"
import { useState } from "react"

export function WorkManagement() {
  const { currentWorkspace } = useWorkspace()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [sprintStart, setSprintStart] = useState("")
  const [sprintEnd, setSprintEnd] = useState("")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const query = useIssues({
    workspaceId: currentWorkspace?.id ?? "",
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    search,
    status: status || undefined,
  })
  const sprints = usePlatformQuery<{ data: Sprint[] }>(
    "/task/sprint",
    { workspaceId: currentWorkspace?.id ?? "" },
    Boolean(currentWorkspace)
  )
  const report = usePlatformQuery<{
    data: { status: string; issues: number; points: number }[]
  }>(
    "/task/report",
    { workspaceId: currentWorkspace?.id ?? "" },
    Boolean(currentWorkspace)
  )
  const directory = usePlatformQuery<WorkspaceDirectory>(
    `/task/workspace/${currentWorkspace?.id}/directory`,
    undefined,
    Boolean(currentWorkspace)
  )
  const [createIssue, createState] = useCreateIssue()
  const [updateIssue] = useUpdateIssue()
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState("medium")
  const [kind, setKind] = useState("task")
  const [assignee, setAssignee] = useState("")
  const [sprintName, setSprintName] = useState("")
  const [dependency, setDependency] = useState("")
  const [selectedIssue, setSelectedIssue] = useState("")
  const dependencies = usePlatformQuery<{
    data: { dependsOnId: string; title: string; status: string }[]
  }>(
    `/task/issue/${selectedIssue}/dependency`,
    undefined,
    Boolean(selectedIssue)
  )
  const [error, setError] = useState("")
  const attempt = async (operation: () => Promise<unknown>) => {
    setError("")
    try {
      await operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operation failed")
    }
  }
  const change = (issue: Issue, value: Partial<Issue>) =>
    attempt(async () => {
      await updateIssue({
        id: issue.pageId,
        version: issue.version,
        ...value,
      }).unwrap()
      await report.refetch()
    })
  const columns = [
    { accessorKey: "number", header: "Issue" },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }: { row: { original: Issue } }) => (
        <Link
          href={`/document/${row.original.pageId}`}
          className="font-medium hover:underline"
        >
          {row.original.title}
        </Link>
      ),
    },
    { accessorKey: "kind", header: "Type" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: { original: Issue } }) => (
        <select
          aria-label={`Status of ${row.original.title}`}
          value={row.original.status}
          onChange={(event) =>
            void change(row.original, { status: event.target.value })
          }
          className="h-9 rounded-md border bg-background px-2"
        >
          {issueStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }: { row: { original: Issue } }) => (
        <select
          aria-label={`Priority of ${row.original.title}`}
          value={row.original.priority}
          onChange={(event) =>
            void change(row.original, { priority: event.target.value })
          }
          className="h-9 rounded-md border bg-background px-2"
        >
          {["low", "medium", "high", "urgent"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      ),
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: ({ row }: { row: { original: Issue } }) => (
        <select
          aria-label={`Assignee of ${row.original.title}`}
          value={row.original.assigneeId ?? ""}
          onChange={(event) =>
            void change(row.original, {
              assigneeId: event.target.value || null,
            })
          }
          className="h-9 rounded-md border bg-background px-2"
        >
          <option value="">Unassigned</option>
          {directory.data?.data.members
            .filter((member) => member.status === "active")
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
        </select>
      ),
    },
    {
      id: "estimate",
      header: "Points",
      cell: ({ row }: { row: { original: Issue } }) => (
        <Input
          type="number"
          min={0}
          max={10000}
          aria-label={`Estimate of ${row.original.title}`}
          key={`${row.original.pageId}-${row.original.version}`}
          defaultValue={row.original.estimate ?? ""}
          onBlur={(event) => {
            const estimate =
              event.target.value === "" ? null : Number(event.target.value)
            if (estimate !== row.original.estimate)
              void change(row.original, { estimate })
          }}
          className="w-24"
        />
      ),
    },
    {
      id: "due",
      header: "Due",
      cell: ({ row }: { row: { original: Issue } }) => (
        <Input
          type="date"
          aria-label={`Due date of ${row.original.title}`}
          key={`${row.original.pageId}-${row.original.version}`}
          defaultValue={row.original.dueAt?.slice(0, 10) ?? ""}
          onBlur={(event) => {
            const dueAt = event.target.value
              ? new Date(`${event.target.value}T00:00:00Z`).toISOString()
              : null
            if (dueAt !== row.original.dueAt)
              void change(row.original, { dueAt })
          }}
          className="w-40"
        />
      ),
    },
    {
      id: "sprint",
      header: "Sprint",
      cell: ({ row }: { row: { original: Issue } }) => (
        <select
          aria-label={`Sprint of ${row.original.title}`}
          value={row.original.sprintId ?? ""}
          onChange={(event) =>
            void change(row.original, { sprintId: event.target.value || null })
          }
          className="h-9 rounded-md border bg-background px-2"
        >
          <option value="">Backlog</option>
          {sprints.data?.data
            .filter((item) => item.status !== "completed")
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      ),
    },
  ]
  if (!currentWorkspace)
    return <p className="p-6">Choose or create a workspace.</p>
  return (
    <main className="space-y-6 p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {report.data?.data.map((item) => (
          <Card key={item.status}>
            <CardHeader>
              <CardTitle>{item.status}</CardTitle>
            </CardHeader>
            <CardContent>
              {item.issues} issues · {item.points} points
            </CardContent>
          </Card>
        ))}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void attempt(async () => {
            await createIssue({
              workspaceId: currentWorkspace.id,
              title,
              kind,
              priority,
              assigneeId: assignee || null,
            }).unwrap()
            setTitle("")
            await report.refetch()
          })
        }}
      >
        <Input
          required
          aria-label="Issue title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="max-w-sm"
        />
        <select
          aria-label="Issue type"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className="rounded-md border bg-background px-3"
        >
          {["task", "bug", "story", "epic"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="rounded-md border bg-background px-3"
        >
          {["low", "medium", "high", "urgent"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Assignee"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          className="h-9 rounded-md border bg-background px-3"
        >
          <option value="">Unassigned</option>
          {directory.data?.data.members
            .filter((member) => member.status === "active")
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
        </select>
        <Button type="submit" disabled={!title.trim() || createState.isLoading}>
          Create issue
        </Button>
      </form>
      <p role="alert" className="text-sm text-destructive">
        {error || (query.isError ? "Unable to load issues. Retry below." : "")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          aria-label="Search issues"
          placeholder="Search issues…"
          onChange={(event) => {
            setSearch(event.target.value)
            setPagination((value) => ({ ...value, pageIndex: 0 }))
          }}
          className="max-w-sm"
        />
        <select
          aria-label="Filter issue status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPagination((value) => ({ ...value, pageIndex: 0 }))
          }}
          className="h-9 rounded-md border bg-background px-3"
        >
          <option value="">All statuses</option>
          {issueStatuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <DataTable<Issue>
        nav={{
          name: "Issues",
          description: "Backlog, workflow and sprint planning",
        }}
        columns={columns}
        data={query.data?.data ?? []}
        rowCount={query.data?.pagination.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={query.isLoading}
        getRowId={(row) => row.pageId}
        onReload={() => void query.refetch()}
      />
      <Card>
        <CardHeader>
          <CardTitle>Sprints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void attempt(async () => {
                await platformMutation("/task/sprint", {
                  workspaceId: currentWorkspace.id,
                  name: sprintName,
                  startsAt: sprintStart || undefined,
                  endsAt: sprintEnd || undefined,
                })
                setSprintName("")
                await sprints.refetch()
              })
            }}
          >
            <Input
              required
              aria-label="Sprint name"
              placeholder="New sprint"
              value={sprintName}
              onChange={(event) => setSprintName(event.target.value)}
            />
            <Input
              type="date"
              aria-label="Sprint start"
              value={sprintStart}
              onChange={(event) => setSprintStart(event.target.value)}
            />
            <Input
              type="date"
              aria-label="Sprint end"
              value={sprintEnd}
              onChange={(event) => setSprintEnd(event.target.value)}
            />
            <Button type="submit">Create sprint</Button>
          </form>
          {sprints.data?.data.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span>
                {item.name} · {item.status}
              </span>
              {item.status !== "completed" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void attempt(async () => {
                      await platformMutation(
                        `/task/sprint/${item.id}/transition`,
                        {
                          action:
                            item.status === "planned" ? "start" : "complete",
                        }
                      )
                      await sprints.refetch()
                      await query.refetch()
                    })
                  }
                >
                  {item.status === "planned" ? "Start" : "Complete"}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void attempt(async () => {
                await platformMutation(
                  `/task/issue/${selectedIssue}/dependency`,
                  { dependsOnId: dependency }
                )
                await dependencies.refetch()
              })
            }}
          >
            <select
              required
              aria-label="Issue"
              value={selectedIssue}
              onChange={(event) => setSelectedIssue(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Choose issue</option>
              {query.data?.data.map((issue) => (
                <option key={issue.pageId} value={issue.pageId}>
                  #{issue.number} {issue.title}
                </option>
              ))}
            </select>
            <select
              required
              aria-label="Blocked by"
              value={dependency}
              onChange={(event) => setDependency(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Blocked by</option>
              {query.data?.data
                .filter((issue) => issue.pageId !== selectedIssue)
                .map((issue) => (
                  <option key={issue.pageId} value={issue.pageId}>
                    #{issue.number} {issue.title}
                  </option>
                ))}
            </select>
            <Button type="submit">Add dependency</Button>
          </form>
          {dependencies.data?.data.map((item) => (
            <div
              key={item.dependsOnId}
              className="mt-3 flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
            >
              <Link href={`/document/${item.dependsOnId}`}>
                {item.title} · {item.status}
              </Link>
              <Button
                variant="ghost"
                onClick={() =>
                  void attempt(async () => {
                    await platformMutation(
                      `/task/issue/${selectedIssue}/dependency/${item.dependsOnId}`,
                      undefined,
                      "DELETE"
                    )
                    await dependencies.refetch()
                  })
                }
              >
                Remove dependency
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
