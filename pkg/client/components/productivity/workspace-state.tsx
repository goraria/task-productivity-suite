import { AlertCircle, FolderOpen } from "@gorth/primitive/cores/lucide"
import { Button } from "@gorth/primitive/custom/button"
import { Spinner } from "@gorth/primitive/pattern/spinner"

export function WorkspaceLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Spinner variant="infinite" className="text-muted-foreground size-8" />
    </div>
  )
}

export function WorkspaceError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="space-y-3">
        <AlertCircle className="text-destructive mx-auto size-10" />
        <div>
          <h2 className="font-semibold">Could not load workspace</h2>
          <p className="text-muted-foreground text-sm">
            Check the task server connection and try again.
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}

export function EmptyWorkspaceState({
  onCreate,
  loading,
}: {
  onCreate: () => void
  loading?: boolean
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <div className="bg-muted mx-auto grid size-14 place-items-center rounded-2xl">
          <FolderOpen className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Create your first workspace</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pages, databases, tasks and files all live inside a workspace.
          </p>
        </div>
        <Button onClick={onCreate} disabled={loading}>
          {loading ? "Creating..." : "Create workspace"}
        </Button>
      </div>
    </div>
  )
}
