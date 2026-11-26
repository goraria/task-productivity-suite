"use client"
import { useWorkspace } from "@/providers/workspace"
import { platformMutation, usePlatformQuery } from "@/queries/platform"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { useState } from "react"
export interface WorkspaceDirectory {
  data: {
    canManage: boolean
    members: { id: string; name: string; role: string; status: string }[]
  }
}
export function MemberManagement() {
  const { currentWorkspace, currentUser } = useWorkspace()
  const directory = usePlatformQuery<WorkspaceDirectory>(
    `/task/workspace/${currentWorkspace?.id}/directory`,
    undefined,
    Boolean(currentWorkspace)
  )
  const invitations = usePlatformQuery<{
    data: { workspaceId: string; name: string; role: string }[]
  }>("/task/workspace/invitation")
  const [email, setEmail] = useState("")
  const [newOwner, setNewOwner] = useState("")
  const [role, setRole] = useState("member")
  const [error, setError] = useState("")
  const attempt = async (operation: () => Promise<unknown>) => {
    setError("")
    try {
      await operation()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Membership update failed"
      )
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members and invitations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {directory.data?.data.canManage && (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void attempt(async () => {
                await platformMutation(
                  `/task/workspace/${currentWorkspace!.id}/invitation`,
                  { email, role }
                )
                setEmail("")
                await directory.refetch()
              })
            }}
          >
            <Input
              required
              type="email"
              placeholder="Invite by email"
              aria-label="Invite email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <select
              aria-label="Member role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
            <Button type="submit">Invite</Button>
          </form>
        )}
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        {directory.data?.data.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-2 rounded-md border p-3"
          >
            <span>
              {member.name} · {member.role} · {member.status}
            </span>
            {directory.data?.data.canManage && member.role !== "owner" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    void attempt(async () => {
                      await platformMutation(
                        `/task/workspace-member/${currentWorkspace!.id}/${member.id}`,
                        {
                          status:
                            member.status === "suspended"
                              ? "active"
                              : "suspended",
                        },
                        "PATCH"
                      )
                      await directory.refetch()
                    })
                  }
                >
                  {member.status === "suspended" ? "Restore" : "Suspend"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void attempt(async () => {
                      await platformMutation(
                        `/task/workspace-member/${currentWorkspace!.id}/${member.id}`,
                        undefined,
                        "DELETE"
                      )
                      await directory.refetch()
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        ))}
        {currentWorkspace && currentWorkspace.ownerId === currentUser?.id ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (
                !window.confirm(
                  "Transfer workspace ownership to this member? You will become an administrator."
                )
              )
                return
              void attempt(async () => {
                await platformMutation(
                  `/task/workspace/${currentWorkspace.id}/transfer`,
                  { ownerId: newOwner }
                )
                window.location.reload()
              })
            }}
          >
            <select
              required
              aria-label="New workspace owner"
              value={newOwner}
              onChange={(event) => setNewOwner(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Transfer ownership to…</option>
              {directory.data?.data.members
                .filter(
                  (member) =>
                    member.status === "active" &&
                    !["owner", "guest"].includes(member.role)
                )
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
            <Button type="submit" variant="outline" disabled={!newOwner}>
              Transfer ownership
            </Button>
          </form>
        ) : (
          currentWorkspace && (
            <Button
              variant="outline"
              onClick={() => {
                if (
                  !window.confirm(
                    "Leave this workspace? A manager will need to invite you again to return."
                  )
                )
                  return
                void attempt(async () => {
                  await platformMutation(
                    `/task/workspace/${currentWorkspace.id}/leave`,
                    {}
                  )
                  window.location.reload()
                })
              }}
            >
              Leave workspace
            </Button>
          )
        )}
        {invitations.data?.data.map((invitation) => (
          <div
            key={invitation.workspaceId}
            className="flex justify-between rounded-md border p-3"
          >
            <span>Invitation to {invitation.name}</span>
            <Button
              onClick={() =>
                void attempt(async () => {
                  await platformMutation(
                    `/task/workspace/${invitation.workspaceId}/accept`,
                    {}
                  )
                  window.location.reload()
                })
              }
            >
              Accept invitation
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void attempt(async () => {
                  await platformMutation(
                    `/task/workspace/${invitation.workspaceId}/leave`,
                    {}
                  )
                  await invitations.refetch()
                })
              }
            >
              Decline
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
