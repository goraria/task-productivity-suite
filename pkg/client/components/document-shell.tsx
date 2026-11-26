import Link from "next/link"

import { demoDocuments } from "@/utils/document-demo"

export function DocumentShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden h-screen border-r bg-muted/25 p-3 md:sticky md:top-0 md:block">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-foreground text-xs text-background">Z</span>
          Zotion workspace
        </div>

        <nav className="mt-4 space-y-1 text-sm">
          <Link className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-medium" href="/document">
            <span>⌂</span> Home
          </Link>
          <span className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
            <span>⌕</span> Search
          </span>
          <span className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground">
            <span>✦</span> AI assistant
          </span>
        </nav>

        <div className="mt-7 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Private</div>
        <nav className="mt-2 space-y-1 text-sm">
          {demoDocuments.map((document) => (
            <Link
              key={document.id}
              href={`/document/${document.id}`}
              className="flex items-center gap-2 truncate rounded-md px-3 py-2 hover:bg-muted"
            >
              <span>{document.icon}</span>
              <span className="truncate">{document.title}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-3 left-3 right-3 border-t pt-3 text-xs text-muted-foreground">
          Demo workspace · Local data only
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
