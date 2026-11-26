"use client"

import { usePathname } from "next/navigation"
import { Bell, Search } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import { SidebarTrigger } from "@gorth/primitive/custom/sidebar"
import { Separator } from "@gorth/primitive/default/separator"
import { ModeToggle } from "@gorth/primitive/element/mode-toggle"

import { useWorkspace } from "@/providers/workspace"

export function WorkspaceHeader() {
  const pathname = usePathname()
  const { currentWorkspace, pages, databases } = useWorkspace()
  const page = pages.find((item) => pathname === `/document/${item.id}`)
  const database = databases.find((item) => pathname === `/database/${item.id}`)
  const title =
    page?.title ??
    database?.title ??
    (pathname === "/workspace" ? "Workspace settings" : "Home")

  return (
    <header className="bg-background/90 flex h-14 shrink-0 items-center justify-between border-b px-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="size-9" />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-muted-foreground hidden truncate text-sm sm:inline">
          {currentWorkspace?.name ?? "Task workspace"}
        </span>
        <span className="text-muted-foreground hidden sm:inline">/</span>
        <span className="truncate text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Search">
          <Search className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <ModeToggle />
      </div>
    </header>
  )
}
