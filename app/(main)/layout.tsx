import { AuthGuard } from "@/layouts/guard"
import { WorkspaceShell } from "@/components/productivity/workspace-shell"

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AuthGuard>
  )
}
