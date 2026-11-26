"use client"
import { AutomationSettings } from "@/components/productivity/automation-settings"
import {
  MemberManagement,
  type WorkspaceDirectory,
} from "@/components/productivity/member-management"
import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"
import { useServerDraft } from "@/hooks/use-server-draft"
import { useWorkspace } from "@/providers/workspace"
import { usePlatformQuery } from "@/queries/platform"
import { useUpdateWorkspaceMutation } from "@/queries/productivity"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { useState } from "react"

export function WorkspaceSettings() {
  const { currentWorkspace, isLoading, isError } = useWorkspace()
  const directory = usePlatformQuery<WorkspaceDirectory>(
    `/task/workspace/${currentWorkspace?.id}/directory`,
    undefined,
    Boolean(currentWorkspace)
  )
  const [update, state] = useUpdateWorkspaceMutation()
  const [name, setName] = useServerDraft(currentWorkspace?.name ?? "")
  const [icon, setIcon] = useServerDraft(currentWorkspace?.icon ?? "")
  const [allowGuests, setAllowGuests] = useServerDraft(
    Boolean(currentWorkspace?.settings.allowGuests)
  )
  const [error, setError] = useState("")
  if (isLoading) return <WorkspaceLoading />
  if (isError || !currentWorkspace) return <WorkspaceError />
  const canManage = directory.data?.data.canManage === true
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Workspace settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Identity, membership and automation for {currentWorkspace.name}.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Workspace managers can change these settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setError("")
              void update({
                id: currentWorkspace.id,
                body: {
                  name: name.trim(),
                  icon: icon.trim() || null,
                  settings: { ...currentWorkspace.settings, allowGuests },
                },
              })
                .unwrap()
                .catch((cause) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Unable to update settings"
                  )
                )
            }}
          >
            <label className="grid gap-2 text-sm">
              Name
              <Input
                required
                disabled={!canManage}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm">
              Icon
              <Input
                disabled={!canManage}
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
              />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={allowGuests}
                onChange={(event) => setAllowGuests(event.target.checked)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                Allow guest invitations
                <span className="block text-xs text-muted-foreground">
                  Guests can view workspace-shared pages. Restricted pages
                  require an explicit grant.
                </span>
              </span>
            </label>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              type="submit"
              disabled={!canManage || !name.trim() || state.isLoading}
            >
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
      <MemberManagement />
      {canManage && <AutomationSettings />}
    </main>
  )
}
