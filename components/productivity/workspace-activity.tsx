"use client"
import { useWorkspace } from "@/providers/workspace"
import { platformMutation, usePlatformQuery } from "@/queries/platform"
import { Button } from "@gorth-com/primitive/custom/button"
import { DataTable } from "@gorth-com/primitive/custom/data-table"
import { useState } from "react"
interface Activity {
  id: string
  action: string
  outcome: string
  occurredAt: string
}
export function WorkspaceActivity() {
  const { currentWorkspace } = useWorkspace()
  const [error, setError] = useState("")
  const [deliveryPage, setDeliveryPage] = useState(0)
  const delivery = usePlatformQuery<{
    data: {
      id: string
      type: string
      attempts: number
      deliveredAt: string | null
      lastError: string | null
    }[]
    pagination: { hasMore: boolean }
  }>(
    `/task/workspace/${currentWorkspace?.id}/delivery`,
    { limit: 20, offset: deliveryPage * 20 },
    Boolean(currentWorkspace)
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const query = usePlatformQuery<{
    data: Activity[]
    pagination: { hasMore: boolean }
  }>(
    `/task/workspace/${currentWorkspace?.id}/activity`,
    {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
    },
    Boolean(currentWorkspace)
  )
  return (
    <main className="space-y-4 p-6">
      {query.isError && (
        <p role="alert">
          Activity is available to workspace managers when the activity service
          is online.
        </p>
      )}
      <DataTable<Activity>
        nav={{
          name: "Activity",
          description: "Workspace changes and their outcomes",
        }}
        columns={[
          { accessorKey: "action", header: "Action" },
          { accessorKey: "outcome", header: "Result" },
          { accessorKey: "occurredAt", header: "Time" },
        ]}
        data={query.data?.data ?? []}
        rowCount={
          pagination.pageIndex * pagination.pageSize +
          (query.data?.data.length ?? 0) +
          (query.data?.pagination.hasMore ? 1 : 0)
        }
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={query.isLoading}
        getRowId={(row) => row.id}
        onReload={() => void query.refetch()}
      />
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">Platform delivery</h2>
        <p className="text-sm text-muted-foreground">
          Pending events retry automatically. After correcting service
          configuration, a manager can retry a failed delivery.
        </p>
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        {delivery.isError && (
          <p role="status">
            Delivery status is available to workspace managers.
          </p>
        )}
        {delivery.data?.data.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between gap-3 border-b py-2 text-sm"
          >
            <span>
              {event.type} ·{" "}
              {event.deliveredAt
                ? "Delivered"
                : event.attempts >= 20
                  ? "Needs attention"
                  : "Pending"}{" "}
              · {event.attempts} attempts
              {event.lastError && ` · ${event.lastError}`}
            </span>
            {!event.deliveredAt && (
              <Button
                variant="outline"
                onClick={() => {
                  setError("")
                  void platformMutation(
                    `/task/workspace/${currentWorkspace!.id}/delivery/${event.id}/retry`,
                    {}
                  )
                    .then(() => delivery.refetch())
                    .catch((cause) =>
                      setError(
                        cause instanceof Error ? cause.message : "Retry failed"
                      )
                    )
                }}
              >
                Retry
              </Button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={deliveryPage === 0}
            onClick={() => setDeliveryPage((value) => value - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!delivery.data?.pagination.hasMore}
            onClick={() => setDeliveryPage((value) => value + 1)}
          >
            Next
          </Button>
          <Button variant="ghost" onClick={() => void delivery.refetch()}>
            Refresh
          </Button>
        </div>
      </section>
    </main>
  )
}
