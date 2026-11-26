"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  Columns3,
  Database as DatabaseIcon,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Table2,
  Trash2,
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import { Input } from "@gorth/primitive/default/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gorth/primitive/default/table"

import type {
  DatabaseProperty,
  DatabaseView,
  DatabaseViewType,
  Page,
  PagePropertyValue,
} from "@/lib/productivity"
import { formatRelativeDate } from "@/utils/formatter"
import { useWorkspace } from "@/providers/workspace"
import {
  useCreateDatabasePropertyMutation,
  useCreateDatabaseViewMutation,
  useCreatePageMutation,
  useCreatePagePropertyValueMutation,
  useDatabasePropertiesQuery,
  useDatabaseQuery,
  useDatabaseViewsQuery,
  useDeleteDatabaseMutation,
  usePagePropertyValuesQuery,
  useUpdateDatabaseMutation,
  useUpdatePageMutation,
  useUpdatePagePropertyValueMutation,
} from "@/services/productivity"
import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"

interface DatabaseWorkspaceProps {
  databaseId: string
}

interface DatabaseCellProps {
  page: Page
  property: DatabaseProperty
  propertyValue?: PagePropertyValue
}

const viewIcons = {
  table: Table2,
  board: Columns3,
  calendar: CalendarDays,
  list: List,
  gallery: LayoutGrid,
  timeline: MoreHorizontal,
} satisfies Record<DatabaseViewType, typeof Table2>

function readPropertyValue(value: unknown) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string" || typeof value === "number")
    return String(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object" && "value" in value) {
    return readPropertyValue((value as { value: unknown }).value)
  }
  return JSON.stringify(value)
}

function DatabaseCell({ page, property, propertyValue }: DatabaseCellProps) {
  const [value, setValue] = useState(() =>
    property.type === "title"
      ? page.title
      : readPropertyValue(propertyValue?.value)
  )
  const [updatePage] = useUpdatePageMutation()
  const [createValue] = useCreatePagePropertyValueMutation()
  const [updateValue] = useUpdatePagePropertyValueMutation()

  useEffect(() => {
    setValue(
      property.type === "title"
        ? page.title
        : readPropertyValue(propertyValue?.value)
    )
  }, [page.title, property.type, propertyValue?.value])

  const save = async () => {
    if (property.type === "title") {
      if (value.trim() !== page.title) {
        await updatePage({
          id: page.id,
          body: { title: value.trim() || "Untitled" },
        }).unwrap()
      }
      return
    }

    const nextValue = { value }
    if (propertyValue) {
      await updateValue({
        firstId: page.id,
        secondId: property.id,
        body: { value: nextValue },
      }).unwrap()
      return
    }
    await createValue({
      workspaceId: page.workspaceId,
      pageId: page.id,
      propertyId: property.id,
      value: nextValue,
    }).unwrap()
  }

  if (property.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={value === "true"}
        onChange={async (event) => {
          const next = event.target.checked ? "true" : "false"
          setValue(next)
          if (propertyValue) {
            await updateValue({
              firstId: page.id,
              secondId: property.id,
              body: { value: { value: event.target.checked } },
            }).unwrap()
          } else {
            await createValue({
              workspaceId: page.workspaceId,
              pageId: page.id,
              propertyId: property.id,
              value: { value: event.target.checked },
            }).unwrap()
          }
        }}
        className="accent-primary size-4 rounded"
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      className="hover:border-input focus-visible:border-ring h-8 min-w-36 border-transparent bg-transparent px-1 shadow-none"
      placeholder={property.name}
    />
  )
}

function TableView({
  rows,
  properties,
  values,
}: {
  rows: Page[]
  properties: DatabaseProperty[]
  values: PagePropertyValue[]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {properties.map((property) => (
              <TableHead key={property.id} className="min-w-44">
                <div className="flex items-center gap-2">
                  <span>{property.name}</span>
                  <Badge variant="default" className="text-[10px]">
                    {property.type.replaceAll("_", " ")}
                  </Badge>
                </div>
              </TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((page) => (
            <TableRow key={page.id}>
              {properties.map((property) => (
                <TableCell key={property.id} className="p-1">
                  <DatabaseCell
                    page={page}
                    property={property}
                    propertyValue={values.find(
                      (value) =>
                        value.pageId === page.id &&
                        value.propertyId === property.id
                    )}
                  />
                </TableCell>
              ))}
              <TableCell className="p-1">
                <Button
                  render={<Link href={`/document/${page.id}`} />}
                  variant="ghost"
                  size="icon"
                  aria-label={`Open ${page.title}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function BoardView({
  rows,
  properties,
  values,
}: {
  rows: Page[]
  properties: DatabaseProperty[]
  values: PagePropertyValue[]
}) {
  const groupProperty = properties.find((property) =>
    ["status", "select"].includes(property.type)
  )
  const groupedRows = useMemo(() => {
    const groups = new Map<string, Page[]>()
    for (const row of rows) {
      const propertyValue = values.find(
        (value) =>
          value.pageId === row.id && value.propertyId === groupProperty?.id
      )
      const group = readPropertyValue(propertyValue?.value) || "No status"
      groups.set(group, [...(groups.get(group) ?? []), row])
    }
    return [...groups.entries()]
  }, [groupProperty?.id, rows, values])

  return (
    <div className="grid auto-cols-[280px] grid-flow-col gap-4 overflow-x-auto pb-3">
      {groupedRows.map(([group, groupRows]) => (
        <div key={group} className="bg-muted/50 rounded-lg p-3">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="default">{group}</Badge>
            <span className="text-muted-foreground text-xs">
              {groupRows.length}
            </span>
          </div>
          <div className="space-y-2">
            {groupRows.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-3">
                  <Link
                    href={`/document/${row.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.icon ?? "📄"} {row.title}
                  </Link>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Updated {formatRelativeDate(row.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GalleryView({ rows }: { rows: Page[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Card key={row.id} className="overflow-hidden">
          <div className="from-primary/20 via-muted h-28 bg-linear-to-br to-transparent" />
          <CardHeader>
            <CardTitle className="text-base">
              <Link href={`/document/${row.id}`} className="hover:underline">
                {row.icon ?? "📄"} {row.title}
              </Link>
            </CardTitle>
            <CardDescription>
              {formatRelativeDate(row.updatedAt)}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export function DatabaseWorkspace({ databaseId }: DatabaseWorkspaceProps) {
  const router = useRouter()
  const databaseQuery = useDatabaseQuery(databaseId)
  const propertiesQuery = useDatabasePropertiesQuery()
  const valuesQuery = usePagePropertyValuesQuery()
  const viewsQuery = useDatabaseViewsQuery()
  const { pages } = useWorkspace()
  const [title, setTitle] = useState("")
  const [search, setSearch] = useState("")
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [updateDatabase] = useUpdateDatabaseMutation()
  const [deleteDatabase] = useDeleteDatabaseMutation()
  const [createPage, createPageState] = useCreatePageMutation()
  const [createProperty, createPropertyState] =
    useCreateDatabasePropertyMutation()
  const [createView, createViewState] = useCreateDatabaseViewMutation()

  const database = databaseQuery.data
  useEffect(() => setTitle(database?.title ?? ""), [database?.title])

  const properties = (propertiesQuery.data?.data ?? [])
    .filter((property) => property.databaseId === databaseId)
    .sort((first, second) => first.position - second.position)
  const values = valuesQuery.data?.data ?? []
  const views = (viewsQuery.data?.data ?? [])
    .filter((view) => view.databaseId === databaseId)
    .sort((first, second) => first.position - second.position)
  const rows = pages.filter(
    (page) =>
      page.databaseId === databaseId &&
      page.title.toLowerCase().includes(search.toLowerCase())
  )
  const activeView =
    views.find((view) => view.id === selectedViewId) ??
    views.find((view) => view.isDefault) ??
    views[0]

  useEffect(() => {
    if (!selectedViewId && views[0]) setSelectedViewId(views[0].id)
  }, [selectedViewId, views])

  if (
    databaseQuery.isLoading ||
    propertiesQuery.isLoading ||
    valuesQuery.isLoading ||
    viewsQuery.isLoading
  ) {
    return <WorkspaceLoading />
  }
  if (databaseQuery.isError || !database) return <WorkspaceError />

  const saveTitle = async () => {
    const nextTitle = title.trim() || "Untitled database"
    setTitle(nextTitle)
    if (nextTitle !== database.title) {
      await updateDatabase({
        id: database.id,
        body: { title: nextTitle },
      }).unwrap()
    }
  }

  const addRow = async () => {
    await createPage({
      workspaceId: database.workspaceId,
      databaseId: database.id,
      title: "Untitled",
      icon: "📄",
      position: rows.length,
    }).unwrap()
  }

  const addProperty = async () => {
    const isFirstProperty = properties.length === 0
    await createProperty({
      workspaceId: database.workspaceId,
      databaseId: database.id,
      name: isFirstProperty ? "Name" : `Property ${properties.length + 1}`,
      type: isFirstProperty ? "title" : "text",
      position: properties.length,
    }).unwrap()
  }

  const addView = async (type: DatabaseViewType) => {
    const view = await createView({
      workspaceId: database.workspaceId,
      databaseId: database.id,
      name: `${type[0]?.toUpperCase()}${type.slice(1)}`,
      type,
      position: views.length,
      isDefault: views.length === 0,
    }).unwrap()
    setSelectedViewId(view.id)
  }

  const removeDatabase = async () => {
    await deleteDatabase(database.id).unwrap()
    router.push("/document")
  }

  const viewType = activeView?.type ?? "table"

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 p-6 lg:p-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 text-5xl">{database.icon ?? "▦"}</div>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            className="h-auto max-w-2xl border-0 px-0 text-4xl font-bold tracking-tight shadow-none focus-visible:ring-0"
          />
          <p className="text-muted-foreground mt-2 text-sm">
            {database.description ?? "A structured workspace database."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={addProperty}
            disabled={createPropertyState.isLoading}
          >
            <Plus className="size-4" />
            Property
          </Button>
          <Button onClick={addRow} disabled={createPageState.isLoading}>
            <Plus className="size-4" />
            New
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete database"
            onClick={removeDatabase}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1">
              {views.map((view) => {
                const ViewIcon = viewIcons[view.type]
                return (
                  <Button
                    key={view.id}
                    variant={activeView?.id === view.id ? "secondary" : "ghost"}
                    onClick={() => setSelectedViewId(view.id)}
                  >
                    <ViewIcon className="size-4" />
                    {view.name}
                  </Button>
                )
              })}
              {!views.length && (
                <Button variant="secondary">
                  <Table2 className="size-4" />
                  Table
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() =>
                  addView(views.length % 2 === 0 ? "board" : "table")
                }
                disabled={createViewState.isLoading}
              >
                <Plus className="size-4" />
                View
              </Button>
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search records..."
                className="pl-9"
              />
            </div>
          </div>

          {!properties.length ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <DatabaseIcon className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Define your database</p>
                <p className="text-muted-foreground text-sm">
                  Add a title or text property before creating records.
                </p>
              </div>
              <Button onClick={addProperty}>
                <Plus className="size-4" />
                Add property
              </Button>
            </div>
          ) : viewType === "board" ? (
            <BoardView rows={rows} properties={properties} values={values} />
          ) : viewType === "gallery" ? (
            <GalleryView rows={rows} />
          ) : (
            <TableView rows={rows} properties={properties} values={values} />
          )}

          {properties.length > 0 && (
            <Button variant="ghost" onClick={addRow}>
              <Plus className="size-4" />
              New record
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
