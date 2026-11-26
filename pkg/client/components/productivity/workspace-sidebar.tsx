"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRight,
  Database as DatabaseIcon,
  FileText,
  Home,
  LogOut,
  Plus,
  Search,
  Settings,
  Star,
} from "@gorth/primitive/cores/lucide"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gorth/primitive/custom/avatar"
import { Button } from "@gorth/primitive/custom/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@gorth/primitive/custom/command"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@gorth/primitive/custom/sidebar"

import { useAuth } from "@/hooks/use-auth"
import type { Page } from "@/lib/productivity"
import { getInitials } from "@/utils/formatter"
import { useWorkspace } from "@/providers/workspace"
import {
  useCreateBlockMutation,
  useCreatePageMutation,
} from "@/services/productivity"

function PageTreeItem({
  page,
  pages,
  depth = 0,
}: {
  page: Page
  pages: Page[]
  depth?: number
}) {
  const pathname = usePathname()
  const children = pages.filter(
    (item) => item.parentPageId === page.id && !item.databaseId
  )

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={`/document/${page.id}`} />}
          isActive={pathname === `/document/${page.id}`}
          tooltip={page.title}
          className="gap-2"
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          {children.length ? (
            <ChevronRight className="size-4" />
          ) : (
            <FileText className="size-4" />
          )}
          <span className="truncate">
            {page.icon ?? "📄"} {page.title}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {children.map((child) => (
        <PageTreeItem
          key={child.id}
          page={child}
          pages={pages}
          depth={depth + 1}
        />
      ))}
    </>
  )
}

export function WorkspaceSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const {
    currentUser,
    workspaces,
    currentWorkspace,
    pages,
    databases,
    favorites,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
  } = useWorkspace()
  const [searchOpen, setSearchOpen] = useState(false)
  const [createPage, createPageState] = useCreatePageMutation()
  const [createBlock] = useCreateBlockMutation()

  const favoritePages = useMemo(
    () =>
      favorites
        .map((favorite) => pages.find((page) => page.id === favorite.pageId))
        .filter((page): page is Page => Boolean(page)),
    [favorites, pages]
  )
  const rootPages = pages.filter(
    (page) => !page.parentPageId && !page.databaseId
  )

  const handleCreatePage = async () => {
    if (!selectedWorkspaceId) return
    const page = await createPage({
      workspaceId: selectedWorkspaceId,
      title: "Untitled",
      icon: "📄",
      position: pages.length,
    }).unwrap()
    await createBlock({
      workspaceId: selectedWorkspaceId,
      pageId: page.id,
      type: "text",
      content: { text: "" },
      position: 0,
    }).unwrap()
    router.push(`/document/${page.id}`)
  }

  const navigateFromSearch = (href: string) => {
    setSearchOpen(false)
    router.push(href)
  }

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="bg-background flex items-center gap-2 rounded-md border p-1.5">
            <div className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold">
              {getInitials(currentWorkspace?.name ?? "Task", 1)}
            </div>
            <select
              aria-label="Current workspace"
              value={selectedWorkspaceId ?? ""}
              onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none group-data-[collapsible=icon]:hidden"
            >
              {!workspaces.length && <option value="">No workspace</option>}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/document" />}
                    isActive={pathname === "/document"}
                    tooltip="Home"
                  >
                    <Home className="size-4" />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setSearchOpen(true)}
                    tooltip="Search"
                  >
                    <Search className="size-4" />
                    <span>Search</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/workspace" />}
                    isActive={pathname === "/workspace"}
                    tooltip="Workspace settings"
                  >
                    <Settings className="size-4" />
                    <span>Workspace settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {favoritePages.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Favorites</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {favoritePages.map((page) => (
                    <SidebarMenuItem key={page.id}>
                      <SidebarMenuButton
                        render={<Link href={`/document/${page.id}`} />}
                        isActive={pathname === `/document/${page.id}`}
                        tooltip={page.title}
                      >
                        <Star className="size-4 fill-current" />
                        <span className="truncate">{page.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>Private</SidebarGroupLabel>
            <SidebarGroupAction
              aria-label="Create page"
              onClick={handleCreatePage}
              disabled={!currentWorkspace || createPageState.isLoading}
            >
              <Plus className="size-4" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {rootPages.length ? (
                  rootPages.map((page) => (
                    <PageTreeItem key={page.id} page={page} pages={pages} />
                  ))
                ) : (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleCreatePage}
                      disabled={!currentWorkspace}
                    >
                      <Plus className="size-4" />
                      <span>Add a page</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Databases</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {databases.map((database) => (
                  <SidebarMenuItem key={database.id}>
                    <SidebarMenuButton
                      render={<Link href={`/database/${database.id}`} />}
                      isActive={pathname === `/database/${database.id}`}
                      tooltip={database.title}
                    >
                      <DatabaseIcon className="size-4" />
                      <span className="truncate">
                        {database.icon ?? "▦"} {database.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="bg-background flex items-center gap-2 rounded-md border p-1.5">
            <Avatar size="sm">
              <AvatarImage
                src={currentUser?.image ?? undefined}
                alt={currentUser?.name ?? "User"}
              />
              <AvatarFallback>
                {getInitials(currentUser?.name ?? "User")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">
                {currentUser?.name ?? "Workspace user"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {currentUser?.email ?? "Signed in"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={() => auth.logout("/")}
              className="group-data-[collapsible=icon]:hidden"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search workspace"
        description="Find pages and databases in the current workspace"
      >
        <CommandInput placeholder="Search pages and databases..." />
        <CommandList>
          <CommandEmpty>No result found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem
                key={page.id}
                value={`${page.title} ${page.id}`}
                onSelect={() => navigateFromSearch(`/document/${page.id}`)}
              >
                <FileText className="size-4" />
                <span>
                  {page.icon ?? "📄"} {page.title}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Databases">
            {databases.map((database) => (
              <CommandItem
                key={database.id}
                value={`${database.title} ${database.id}`}
                onSelect={() => navigateFromSearch(`/database/${database.id}`)}
              >
                <DatabaseIcon className="size-4" />
                <span>{database.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
