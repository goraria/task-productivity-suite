"use client"

import type { PropsWithChildren } from "react"
import { SidebarInset, SidebarProvider } from "@gorth/primitive/custom/sidebar"

import { WorkspaceHeader } from "@/components/productivity/workspace-header"
import { WorkspaceSidebar } from "@/components/productivity/workspace-sidebar"
import { WorkspaceProvider } from "@/providers/workspace"

export function WorkspaceShell({ children }: PropsWithChildren) {
  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <WorkspaceSidebar />
        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <WorkspaceHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
