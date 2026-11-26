"use client"

import { MemberManagement } from "@/components/productivity/member-management"
import { DocumentLibrary } from "@/components/productivity/document-library"
import {
  Clock3,
  Database as DatabaseIcon,
  FileText,
  FolderKanban,
  Plus,
  Star,
  Users,
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
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  EmptyWorkspaceState,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"
import { useWorkspace } from "@/providers/workspace"
import {
  useCreateBlockMutation,
  useCreateDatabaseMutation,
  useCreateDatabasePropertyMutation,
  useCreateDatabaseViewMutation,
  useCreatePageMutation,
  useCreateWorkspaceMutation,
  useWorkspaceMembersQuery,
} from "@/queries/productivity"
import { formatRelativeDate, slugify } from "@/utils/formatter"

export function WorkspaceDashboard() {
  const router = useRouter()
  const {
    currentWorkspace,
    pageCount,
    databaseCount,
    selectedWorkspaceId,
    pages,
    databases,
    favorites,
    isLoading,
    isError,
  } = useWorkspace()
  const membersQuery = useWorkspaceMembersQuery({
    workspaceId: selectedWorkspaceId ?? undefined,
    enabled: Boolean(selectedWorkspaceId),
  })
  const [createWorkspace, createWorkspaceState] = useCreateWorkspaceMutation()
  const [createPage, createPageState] = useCreatePageMutation()
  const [createDatabase, createDatabaseState] = useCreateDatabaseMutation()
  const [createBlock] = useCreateBlockMutation()
  const [createDatabaseProperty] = useCreateDatabasePropertyMutation()
  const [createDatabaseView] = useCreateDatabaseViewMutation()

  const members = (membersQuery.data?.data ?? []).filter(
    (member) => member.workspaceId === selectedWorkspaceId
  )
  const recentPages = [...pages]
    .sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime()
    )
    .slice(0, 6)

  if (isLoading) return <WorkspaceLoading />
  if (isError) return <WorkspaceError />

  const handleCreateWorkspace = async () => {
    const name = "My workspace"
    await createWorkspace({
      name,
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      icon: "✨",
    }).unwrap()
  }

  if (!currentWorkspace) {
    return (
      <main className="space-y-6 p-6">
        <EmptyWorkspaceState
          onCreate={handleCreateWorkspace}
          loading={createWorkspaceState.isLoading}
        />
        <MemberManagement />
      </main>
    )
  }

  const handleCreatePage = async () => {
    const page = await createPage({
      workspaceId: currentWorkspace.id,
      title: "Untitled",
      icon: "📄",
      position: pages.length,
    }).unwrap()
    await createBlock({
      workspaceId: currentWorkspace.id,
      pageId: page.id,
      type: "text",
      content: { text: "" },
      position: 0,
    }).unwrap()
    router.push(`/document/${page.id}`)
  }

  const handleCreateDatabase = async () => {
    const database = await createDatabase({
      workspaceId: currentWorkspace.id,
      title: "New database",
      description: "Track projects, tasks and structured knowledge.",
      icon: "▦",
    }).unwrap()
    await Promise.all([
      createDatabaseProperty({
        workspaceId: currentWorkspace.id,
        databaseId: database.id,
        name: "Name",
        type: "title",
        position: 0,
      }).unwrap(),
      createDatabaseView({
        workspaceId: currentWorkspace.id,
        databaseId: database.id,
        name: "Table",
        type: "table",
        position: 0,
        isDefault: true,
      }).unwrap(),
    ])
    router.push(`/database/${database.id}`)
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-6 lg:p-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {currentWorkspace.icon ?? "✨"} {currentWorkspace.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Plan work, write documents and keep structured knowledge in one
            place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCreateDatabase}
            disabled={createDatabaseState.isLoading}
          >
            <DatabaseIcon className="size-4" />
            New database
          </Button>
          <Button
            onClick={handleCreatePage}
            disabled={createPageState.isLoading}
          >
            <Plus className="size-4" />
            New page
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pages", value: pageCount, icon: FileText },
          { label: "Databases", value: databaseCount, icon: FolderKanban },
          { label: "Members", value: members.length, icon: Users },
          { label: "Saved pages loaded", value: favorites.length, icon: Star },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
              </div>
              <div className="bg-muted grid size-10 place-items-center rounded-lg">
                <stat.icon className="size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <DocumentLibrary />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Recently edited</h2>
            <p className="text-muted-foreground text-sm">
              Continue where your team left off.
            </p>
          </div>
          <Badge variant="default">{pages.length} pages</Badge>
        </div>

        {recentPages.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentPages.map((page) => (
              <Card key={page.id} className="group overflow-hidden">
                <Link href={`/document/${page.id}`} className="block h-full">
                  <div className="from-primary/25 via-primary/10 h-20 bg-linear-to-br to-transparent" />
                  <CardHeader className="relative pt-0">
                    <div className="-mt-7 mb-2 text-4xl">
                      {page.icon ?? "📄"}
                    </div>
                    <CardTitle className="truncate text-base group-hover:underline">
                      {page.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {formatRelativeDate(page.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">No pages yet</p>
                <p className="text-muted-foreground text-sm">
                  Create a page to start writing.
                </p>
              </div>
              <Button onClick={handleCreatePage}>
                <Plus className="size-4" />
                New page
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {databases.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold">Team databases</h2>
            <p className="text-muted-foreground text-sm">
              Structured collections with reusable views and properties.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {databases.map((database) => (
              <Card key={database.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="bg-muted grid size-10 shrink-0 place-items-center rounded-lg text-lg">
                    {database.icon ?? "▦"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{database.title}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {database.description ?? "No description"}
                    </p>
                  </div>
                  <Button
                    render={<Link href={`/database/${database.id}`} />}
                    variant="outline"
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
