"use client"

import {
  DateDatabaseView,
  ListDatabaseView,
} from "@/components/productivity/database-views"
import { PropertyManager } from "@/components/productivity/property-manager"
import { useServerDraft } from "@/hooks/use-server-draft"
import { parsePropertyValue } from "@/schemas/productivity"
import { useDatabaseRecords } from "@/queries/database-records"
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
} from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gorth-com/primitive/default/table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import type { WorkspaceDirectory } from "@/components/productivity/member-management"
import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"
import type {
  DatabaseProperty,
  DatabaseViewType,
  Page,
  PagePropertyValue,
} from "@/lib/productivity"
import { usePlatformQuery } from "@/queries/platform"
import {
  useCreateDatabasePropertyMutation,
  useCreateDatabaseViewMutation,
  useCreatePageMutation,
  useCreatePagePropertyValueMutation,
  useDatabaseQuery,
  useDatabaseViewsQuery,
  useDeleteDatabaseMutation,
  useUpdateDatabaseMutation,
  useUpdateDatabaseViewMutation,
  useUpdatePageMutation,
  useUpdatePagePropertyValueMutation,
} from "@/queries/productivity"
import { formatRelativeDate } from "@/utils/formatter"

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
  if (Array.isArray(value)) return value.join(",")
  if (typeof value === "object" && "value" in value) {
    return readPropertyValue((value as { value: unknown }).value)
  }
  return JSON.stringify(value)
}

function DatabaseCell({ page, property, propertyValue }: DatabaseCellProps) {
  const [value, setValue] = useServerDraft(
    property.type === "title"
      ? page.title
      : property.type === "date"
        ? readPropertyValue(propertyValue?.value).slice(0, 10)
        : readPropertyValue(propertyValue?.value)
  )
  const [error, setError] = useState("")
  const people = usePlatformQuery<WorkspaceDirectory>(
    `/task/workspace/${page.workspaceId}/directory`,
    undefined,
    property.type === "person"
  )
  const related = usePlatformQuery<{ data: Page[] }>(
    "/task/page",
    { workspaceId: page.workspaceId, limit: 100 },
    property.type === "relation"
  )
  const files = usePlatformQuery<{ data: { id: string; name: string }[] }>(
    "/task/file",
    { workspaceId: page.workspaceId, limit: 100 },
    property.type === "file"
  )
  const readOnly =
    (page.accessLevel ?? 0) < 3 ||
    [
      "formula",
      "rollup",
      "created_time",
      "created_by",
      "last_edited_time",
      "last_edited_by",
    ].includes(property.type)
  const [updatePage] = useUpdatePageMutation()
  const [createValue] = useCreatePagePropertyValueMutation()
  const [updateValue] = useUpdatePagePropertyValueMutation()

  const save = async (next = value) => {
    const value = next
    if (property.type === "title") {
      if (value.trim() !== page.title) {
        await updatePage({
          id: page.id,
          body: { title: value.trim() || "Untitled", version: page.version },
        }).unwrap()
      }
      return
    }

    const raw = !value.trim()
      ? null
      : property.type === "number"
        ? Number(value)
        : ["relation", "person", "multi_select", "file"].includes(property.type)
          ? value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : value
    const nextValue = {
      value: parsePropertyValue(property.type, raw, property.config),
    }
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

  const persist = async (next: string) => {
    setValue(next)
    setError("")
    try {
      if (property.type === "checkbox") {
        if (propertyValue)
          await updateValue({
            firstId: page.id,
            secondId: property.id,
            body: { value: { value: next === "true" } },
          }).unwrap()
        else
          await createValue({
            workspaceId: page.workspaceId,
            pageId: page.id,
            propertyId: property.id,
            value: { value: next === "true" },
          }).unwrap()
      } else await save(next)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Save failed. Retry your edit."
      )
    }
  }
  const optionTypes = [
    "select",
    "status",
    "multi_select",
    "person",
    "relation",
    "file",
  ]
  let input
  if (property.type === "checkbox")
    input = (
      <input
        type="checkbox"
        disabled={readOnly}
        checked={value === "true"}
        onChange={(event) => void persist(String(event.target.checked))}
        className="size-4 accent-primary"
        aria-label={property.name}
      />
    )
  else if (optionTypes.includes(property.type)) {
    const multiple = ["multi_select", "person", "relation", "file"].includes(
      property.type
    )
    const options =
      property.type === "person"
        ? (people.data?.data.members ?? [])
            .filter((member) => member.status === "active")
            .map((member) => ({ id: member.id, name: member.name }))
        : property.type === "relation"
          ? (related.data?.data ?? []).map((row) => ({
              id: row.id,
              name: row.title,
            }))
          : property.type === "file"
            ? (files.data?.data ?? [])
            : (Array.isArray(property.config.options)
                ? property.config.options
                : []
              ).map((option) => ({ id: String(option), name: String(option) }))
    input = (
      <select
        aria-label={property.name}
        disabled={readOnly}
        multiple={multiple}
        value={multiple ? value.split(",").filter(Boolean) : value}
        onChange={(event) =>
          void persist(
            multiple
              ? Array.from(event.target.selectedOptions)
                  .map((option) => option.value)
                  .join(",")
              : event.target.value
          )
        }
        className="min-h-9 w-full min-w-36 rounded-md border bg-background p-1"
      >
        {!multiple && <option value="">None</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    )
  } else
    input = (
      <Input
        value={value}
        readOnly={readOnly}
        type={
          property.type === "date"
            ? "date"
            : property.type === "number"
              ? "number"
              : "text"
        }
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (!readOnly) void persist(value)
        }}
        className="hover:border-input focus-visible:border-ring h-8 min-w-36 border-transparent bg-transparent px-1 shadow-none"
        placeholder={property.name}
      />
    )
  return (
    <div>
      {input}
      {error && (
        <p role="alert" className="max-w-56 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
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
    if (Array.isArray(groupProperty?.config.options))
      for (const option of groupProperty.config.options)
        groups.set(String(option), [])
    for (const row of rows) {
      const propertyValue = values.find(
        (value) =>
          value.pageId === row.id && value.propertyId === groupProperty?.id
      )
      const group = readPropertyValue(propertyValue?.value) || "No status"
      groups.set(group, [...(groups.get(group) ?? []), row])
    }
    return [...groups.entries()]
  }, [groupProperty, rows, values])

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
                  {groupProperty && (
                    <DatabaseCell
                      page={row}
                      property={groupProperty}
                      propertyValue={values.find(
                        (value) =>
                          value.pageId === row.id &&
                          value.propertyId === groupProperty.id
                      )}
                    />
                  )}
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
  const viewsQuery = useDatabaseViewsQuery({ databaseId })
  const [error, setError] = useState("")
  const attempt = async (operation: () => Promise<unknown>) => {
    setError("")
    try {
      await operation()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update database"
      )
    }
  }
  const [newViewType, setNewViewType] = useState<DatabaseViewType>("table")
  const [updateView] = useUpdateDatabaseViewMutation()
  const [offset, setOffset] = useState(0)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [title, setTitle] = useServerDraft(databaseQuery.data?.title ?? "")
  const [search, setSearch] = useState("")
  const [filterPropertyId, setFilterPropertyId] = useState("")
  const [filterValue, setFilterValue] = useState("")
  const [sortPropertyId, setSortPropertyId] = useState("")
  const pageRows = useDatabaseRecords({
    databaseId,
    offset,
    limit: 20,
    search,
    sort: "title",
    direction: sortDirection,
    filterPropertyId: filterPropertyId || undefined,
    filterValue: filterPropertyId && filterValue ? filterValue : undefined,
    sortPropertyId: sortPropertyId || undefined,
  })
  const pages = pageRows.data?.data ?? []
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [updateDatabase] = useUpdateDatabaseMutation()
  const [deleteDatabase] = useDeleteDatabaseMutation()
  const [createPage, createPageState] = useCreatePageMutation()
  const [createProperty, createPropertyState] =
    useCreateDatabasePropertyMutation()
  const [createView, createViewState] = useCreateDatabaseViewMutation()

  const database = databaseQuery.data

  const properties = (pageRows.data?.properties ?? [])
    .filter((property) => property.databaseId === databaseId)
    .sort((first, second) => first.position - second.position)
  const values = pageRows.data?.values ?? []
  const views = (viewsQuery.data?.data ?? [])
    .filter((view) => view.databaseId === databaseId)
    .sort((first, second) => first.position - second.position)
  const rows = pages.filter((page) => page.databaseId === databaseId)
  const activeView =
    views.find((view) => view.id === selectedViewId) ??
    views.find((view) => view.isDefault) ??
    views[0]

  const loadedViewId = useRef<string | null>(null)
  useEffect(() => {
    if (!activeView || loadedViewId.current === activeView.id) return
    loadedViewId.current = activeView.id
    const config = activeView.config as Record<string, unknown>
    setFilterPropertyId(
      typeof config.filterPropertyId === "string" ? config.filterPropertyId : ""
    )
    setFilterValue(
      typeof config.filterValue === "string" ? config.filterValue : ""
    )
    setSortPropertyId(
      typeof config.sortPropertyId === "string" ? config.sortPropertyId : ""
    )
    setSortDirection(config.direction === "desc" ? "desc" : "asc")
    setOffset(0)
  }, [activeView])

  if (databaseQuery.isLoading || pageRows.isLoading || viewsQuery.isLoading) {
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
  const canEdit = (database.accessLevel ?? 0) >= 3

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 p-6 lg:p-10">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 text-5xl">{database.icon ?? "▦"}</div>
          <Input
            readOnly={!canEdit}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void attempt(saveTitle)}
            className="h-auto max-w-2xl border-0 px-0 text-4xl font-bold tracking-tight shadow-none focus-visible:ring-0"
          />
          <p className="text-muted-foreground mt-2 text-sm">
            {database.description ?? "A structured workspace database."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void attempt(addProperty)}
            disabled={!canEdit || createPropertyState.isLoading}
          >
            <Plus className="size-4" />
            Property
          </Button>
          <Button
            onClick={() => void attempt(addRow)}
            disabled={!canEdit || createPageState.isLoading}
          >
            <Plus className="size-4" />
            New
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!canEdit}
            aria-label="Delete database"
            onClick={() => void attempt(removeDatabase)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </section>

      <p role="alert" className="text-sm text-destructive">
        {error || (pageRows.isError ? "Unable to load database records" : "")}
      </p>
      {canEdit && (
        <PropertyManager
          workspaceId={database.workspaceId}
          databaseId={databaseId}
          properties={properties}
        />
      )}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Filter property"
              value={filterPropertyId}
              onChange={(event) => {
                setFilterPropertyId(event.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <Input
              aria-label="Filter value"
              placeholder="Exact value"
              value={filterValue}
              onChange={(event) => {
                setFilterValue(event.target.value)
                setOffset(0)
              }}
              className="max-w-xs"
            />
            {activeView && (
              <Button
                variant="outline"
                onClick={() =>
                  void attempt(() =>
                    updateView({
                      id: activeView.id,
                      body: {
                        config: {
                          ...activeView.config,
                          filterPropertyId,
                          filterValue,
                          sortPropertyId,
                          direction: sortDirection,
                        },
                      },
                    }).unwrap()
                  )
                }
              >
                Save view settings
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setFilterPropertyId("")
                setFilterValue("")
                setOffset(0)
              }}
            >
              Clear filter
            </Button>
            <select
              aria-label="Sort property"
              value={sortPropertyId}
              onChange={(event) => {
                setSortPropertyId(event.target.value)
                setOffset(0)
              }}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Sort by title</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1">
              {views.map((view) => {
                const ViewIcon = viewIcons[view.type]
                return (
                  <Button
                    key={view.id}
                    variant={activeView?.id === view.id ? "secondary" : "ghost"}
                    onClick={() => {
                      setSelectedViewId(view.id)
                      const config = view.config as Record<string, unknown>
                      setFilterPropertyId(
                        typeof config.filterPropertyId === "string"
                          ? config.filterPropertyId
                          : ""
                      )
                      setFilterValue(
                        typeof config.filterValue === "string"
                          ? config.filterValue
                          : ""
                      )
                      setSortPropertyId(
                        typeof config.sortPropertyId === "string"
                          ? config.sortPropertyId
                          : ""
                      )
                      setSortDirection(
                        config.direction === "desc" ? "desc" : "asc"
                      )
                      setOffset(0)
                    }}
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
              <select
                aria-label="New view type"
                value={newViewType}
                onChange={(event) =>
                  setNewViewType(event.target.value as DatabaseViewType)
                }
                className="h-9 rounded-md border bg-background px-3"
              >
                {Object.keys(viewIcons).map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <Button
                variant="ghost"
                onClick={() => void attempt(() => addView(newViewType))}
                disabled={!canEdit || createViewState.isLoading}
              >
                <Plus className="size-4" />
                View
              </Button>
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setOffset(0)
                }}
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
              <Button
                disabled={!canEdit}
                onClick={() => void attempt(addProperty)}
              >
                <Plus className="size-4" />
                Add property
              </Button>
            </div>
          ) : viewType === "board" ? (
            <BoardView rows={rows} properties={properties} values={values} />
          ) : viewType === "calendar" || viewType === "timeline" ? (
            <DateDatabaseView
              rows={rows}
              properties={properties}
              values={values}
              timeline={viewType === "timeline"}
            />
          ) : viewType === "list" ? (
            <ListDatabaseView rows={rows} />
          ) : viewType === "gallery" ? (
            <GalleryView rows={rows} />
          ) : (
            <TableView rows={rows} properties={properties} values={values} />
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setSortDirection(sortDirection === "asc" ? "desc" : "asc")
              }
            >
              Sort {sortDirection}
            </Button>
            <span className="text-sm text-muted-foreground">
              {pageRows.data?.pagination.total ?? rows.length} records
            </span>
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!pageRows.data?.pagination.hasMore}
              onClick={() => setOffset(offset + 20)}
            >
              Next
            </Button>
          </div>
          {properties.length > 0 && (
            <Button
              disabled={!canEdit}
              variant="ghost"
              onClick={() => void attempt(addRow)}
            >
              <Plus className="size-4" />
              New record
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
