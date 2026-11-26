"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Database,
  FileText,
  KeyRound,
  Save,
  ShieldCheck,
  Users,
} from "@gorth/primitive/cores/lucide"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gorth/primitive/custom/avatar"
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
import { Separator } from "@gorth/primitive/default/separator"

import { getInitials } from "@/utils/formatter"
import { useWorkspace } from "@/providers/workspace"
import {
  usePermissionsQuery,
  useUpdateWorkspaceMutation,
  useUsersQuery,
  useWorkspaceMembersQuery,
} from "@/services/productivity"
import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"

export function WorkspaceSettings() {
  const {
    currentWorkspace,
    selectedWorkspaceId,
    pages,
    databases,
    isLoading,
    isError,
  } = useWorkspace()
  const usersQuery = useUsersQuery()
  const membersQuery = useWorkspaceMembersQuery()
  const permissionsQuery = usePermissionsQuery()
  const [updateWorkspace, updateWorkspaceState] = useUpdateWorkspaceMutation()
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [allowGuests, setAllowGuests] = useState(false)

  useEffect(() => {
    setName(currentWorkspace?.name ?? "")
    setIcon(currentWorkspace?.icon ?? "")
    setAllowGuests(Boolean(currentWorkspace?.settings.allowGuests))
  }, [currentWorkspace])

  const users = usersQuery.data?.data ?? []
  const members = (membersQuery.data?.data ?? []).filter(
    (member) => member.workspaceId === selectedWorkspaceId
  )
  const permissionRules = (permissionsQuery.data?.data ?? []).filter(
    (permission) => permission.workspaceId === selectedWorkspaceId
  )
  const memberRows = useMemo(
    () =>
      members.map((member) => ({
        member,
        user: users.find((user) => user.id === member.userId),
      })),
    [members, users]
  )

  if (
    isLoading ||
    usersQuery.isLoading ||
    membersQuery.isLoading ||
    permissionsQuery.isLoading
  ) {
    return <WorkspaceLoading />
  }
  if (isError || !currentWorkspace) return <WorkspaceError />

  const save = async () => {
    await updateWorkspace({
      id: currentWorkspace.id,
      body: {
        name: name.trim() || currentWorkspace.name,
        icon: icon.trim() || null,
        settings: {
          ...currentWorkspace.settings,
          allowGuests,
        },
      },
    }).unwrap()
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6 lg:p-10">
      <section>
        <Badge variant="default">Workspace administration</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Manage workspace identity, members and access controls.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Members", value: members.length, icon: Users },
          { label: "Pages", value: pages.length, icon: FileText },
          { label: "Databases", value: databases.length, icon: Database },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-muted-foreground text-sm">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold">{item.value}</p>
              </div>
              <div className="bg-muted grid size-10 place-items-center rounded-lg">
                <item.icon className="size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                The name and icon shown throughout your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                Workspace name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Icon
                <Input
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="✨"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input value={currentWorkspace.slug} disabled />
              </label>
              <Button
                onClick={save}
                disabled={!name.trim() || updateWorkspaceState.isLoading}
              >
                <Save className="size-4" />
                Save changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Define how members and guests access workspace content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={allowGuests}
                  onChange={(event) => setAllowGuests(event.target.checked)}
                  className="accent-primary mt-1 size-4 rounded"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Allow guests
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    Guests only see pages explicitly shared with them.
                  </span>
                </span>
              </label>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <KeyRound className="size-4" />
                  Permission rules
                </div>
                <Badge variant="default">{permissionRules.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People with access to {currentWorkspace.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberRows.map(({ member, user }, index) => (
              <div key={`${member.workspaceId}-${member.userId}`}>
                {index > 0 && <Separator className="mb-2" />}
                <div className="flex items-center gap-3 py-2">
                  <Avatar>
                    <AvatarImage
                      src={user?.image ?? undefined}
                      alt={user?.name ?? "Member"}
                    />
                    <AvatarFallback>
                      {getInitials(user?.name ?? "Member")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user?.name || "Workspace member"}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {user?.email ?? member.userId}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="capitalize">
                      {member.role}
                    </Badge>
                    <p className="text-muted-foreground mt-1 text-xs capitalize">
                      {member.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {!memberRows.length && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <ShieldCheck className="text-muted-foreground size-8" />
                <p className="font-medium">No active members</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
