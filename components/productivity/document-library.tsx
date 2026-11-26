"use client"
import type { Page } from "@/lib/productivity"
import { useWorkspace } from "@/providers/workspace"
import { useImportDocument } from "@/queries/documents"
import { usePagesQuery, useUpdatePageMutation } from "@/queries/productivity"
import { Button } from "@gorth-com/primitive/custom/button"
import { DataTable } from "@gorth-com/primitive/custom/data-table"
import { Input } from "@gorth-com/primitive/default/input"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function DocumentLibrary() {
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const [archived, setArchived] = useState(false)
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [error, setError] = useState("")
  const query = usePagesQuery({
    workspaceId: currentWorkspace?.id,
    isArchived: archived,
    search,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    enabled: Boolean(currentWorkspace),
  })
  const [update] = useUpdatePageMutation()
  const [importDocument, importState] = useImportDocument()
  async function importFile(file: File) {
    setError("")
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Choose a document smaller than 5 MB")
      const input = JSON.parse(await file.text())
      if (input.format !== "gorth-document" || input.schemaVersion !== 1)
        throw new Error("Choose a GorTou document export")
      const page = await importDocument({
        workspaceId: currentWorkspace!.id,
        title: input.title,
        blocks: input.blocks,
      }).unwrap()
      router.push(`/document/${page.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed")
    }
  }
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search document title or content…"
          aria-label="Search documents"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPagination((value) => ({ ...value, pageIndex: 0 }))
          }}
          className="max-w-sm"
        />
        <Button
          variant="outline"
          onClick={() => {
            setArchived((value) => !value)
            setPagination((value) => ({ ...value, pageIndex: 0 }))
          }}
        >
          {archived ? "Show active documents" : "Open trash"}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          Import JSON
          <Input
            type="file"
            accept="application/json,.json"
            disabled={importState.isLoading}
            className="max-w-64"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importFile(file)
              event.target.value = ""
            }}
          />
        </label>
      </div>
      {(error || query.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {error || "Unable to load documents"}
        </p>
      )}
      <DataTable<Page>
        nav={{
          name: archived ? "Trash" : "Documents",
          description: archived
            ? "Archived documents retain their revisions and can be restored."
            : "Workspace documents with your effective permissions",
        }}
        columns={[
          {
            accessorKey: "title",
            header: "Document",
            cell: ({ row }) => (
              <Link
                href={`/document/${row.original.id}`}
                className="font-medium"
              >
                {row.original.icon} {row.original.title}
              </Link>
            ),
          },
          {
            accessorKey: "updatedAt",
            header: "Updated",
            cell: ({ row }) =>
              new Date(row.original.updatedAt).toLocaleString(),
          },
          {
            id: "actions",
            header: "",
            cell: ({ row }) => (
              <Button
                variant="ghost"
                onClick={() => {
                  setError("")
                  void update({
                    id: row.original.id,
                    body: {
                      isArchived: !archived,
                      version: row.original.version,
                    },
                  })
                    .unwrap()
                    .catch((cause) =>
                      setError(
                        cause instanceof Error ? cause.message : "Update failed"
                      )
                    )
                }}
              >
                {archived ? "Restore" : "Archive"}
              </Button>
            ),
          },
        ]}
        data={query.data?.data ?? []}
        rowCount={query.data?.pagination.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        onReload={() => void query.refetch()}
      />
    </section>
  )
}
