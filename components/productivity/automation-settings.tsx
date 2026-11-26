"use client"
import type { WorkspaceDirectory } from "@/components/productivity/member-management"
import { useWorkspace } from "@/providers/workspace"
import { automationSchema, type Automation } from "@/schemas/automation"
import { issueStatuses } from "@/schemas/work-management"
import { usePlatformQuery } from "@/queries/platform"
import { useUpdateWorkspaceMutation } from "@/queries/productivity"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { useState } from "react"
export function AutomationSettings() {
  const { currentWorkspace } = useWorkspace()
  const directory = usePlatformQuery<WorkspaceDirectory>(
    `/task/workspace/${currentWorkspace?.id}/directory`,
    undefined,
    Boolean(currentWorkspace)
  )
  const [update, state] = useUpdateWorkspaceMutation()
  const [name, setName] = useState("")
  const [event, setEvent] = useState("issue.created")
  const [from, setFrom] = useState("backlog")
  const [action, setAction] = useState("set_status")
  const [target, setTarget] = useState("todo")
  const [error, setError] = useState("")
  if (!currentWorkspace || !directory.data?.data.canManage) return null
  const rules = (currentWorkspace.settings.automations ?? []) as Automation[]
  const save = async (automations: Automation[]) => {
    setError("")
    try {
      await update({
        id: currentWorkspace.id,
        body: { settings: { ...currentWorkspace.settings, automations } },
      }).unwrap()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save automation"
      )
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Automations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Run workspace rules when an issue is created or updated. Rules follow
          permissions and workflow transitions.
        </p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(submit) => {
            submit.preventDefault()
            try {
              const rule = automationSchema.parse({
                id: crypto.randomUUID(),
                name,
                event,
                enabled: true,
                whenStatus: from,
                action:
                  action === "set_status"
                    ? { kind: action, status: target }
                    : { kind: action, userId: target },
              })
              void save([...rules, rule])
              setName("")
            } catch {
              setError("Choose a valid workflow transition or active assignee")
            }
          }}
        >
          <Input
            required
            aria-label="Automation name"
            placeholder="Rule name"
            value={name}
            onChange={(change) => setName(change.target.value)}
            className="max-w-xs"
          />
          <select
            aria-label="Trigger"
            value={event}
            onChange={(change) => setEvent(change.target.value)}
            className="h-9 rounded-md border bg-background px-3"
          >
            <option value="issue.created">Issue created</option>
            <option value="issue.updated">Issue updated</option>
          </select>
          <select
            aria-label="When status"
            value={from}
            onChange={(change) => setFrom(change.target.value)}
            className="h-9 rounded-md border bg-background px-3"
          >
            {issueStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <select
            aria-label="Action"
            value={action}
            onChange={(change) => {
              setAction(change.target.value)
              setTarget(change.target.value === "set_status" ? "todo" : "")
            }}
            className="h-9 rounded-md border bg-background px-3"
          >
            <option value="set_status">Change status</option>
            <option value="assign">Assign member</option>
          </select>
          <select
            required
            aria-label="Action value"
            value={target}
            onChange={(change) => setTarget(change.target.value)}
            className="h-9 rounded-md border bg-background px-3"
          >
            {action === "set_status" ? (
              issueStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))
            ) : (
              <>
                <option value="">Choose member</option>
                {directory.data?.data.members
                  .filter((member) => member.status === "active")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </>
            )}
          </select>
          <Button
            type="submit"
            disabled={state.isLoading || rules.length >= 20}
          >
            Add automation
          </Button>
        </form>
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
          >
            <span>
              {rule.name} · {rule.enabled ? "Enabled" : "Disabled"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  void save(
                    rules.map((item) =>
                      item.id === rule.id
                        ? { ...item, enabled: !item.enabled }
                        : item
                    )
                  )
                }
              >
                {rule.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  void save(rules.filter((item) => item.id !== rule.id))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
