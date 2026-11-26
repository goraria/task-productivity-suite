import Link from "next/link"

import type { DemoDocument } from "@/utils/document-demo"

interface DocumentEditorDemoProps {
  document: DemoDocument
  preview?: boolean
}

export function DocumentEditorDemo({
  document,
  preview = false,
}: DocumentEditorDemoProps) {
  return (
    <article className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b bg-background/90 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href={preview ? "/" : "/document"}
            className="text-muted-foreground hover:text-foreground"
          >
            {preview ? "Zotion" : "‹ All documents"}
          </Link>
          <span className="text-border">/</span>
          <span className="truncate">
            {document.icon} {document.title}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {preview ? (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-400">
              Published
            </span>
          ) : (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Saved locally
              </span>
              <Link
                href={`/preview/${document.id}`}
                className="rounded-md border px-3 py-1.5 hover:bg-muted"
              >
                Share
              </Link>
              <button
                className="rounded-md px-2 py-1.5 hover:bg-muted"
                aria-label="More options"
              >
                •••
              </button>
            </>
          )}
        </div>
      </header>

      <div className={`h-48 bg-gradient-to-r sm:h-64 ${document.cover}`} />

      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="-mt-10 text-7xl drop-shadow-sm">{document.icon}</div>
        {!preview && (
          <div className="mt-4 flex gap-2 text-sm text-muted-foreground">
            <button className="rounded-md px-2 py-1 hover:bg-muted">
              Add icon
            </button>
            <button className="rounded-md px-2 py-1 hover:bg-muted">
              Add comment
            </button>
          </div>
        )}

        <h1
          className="mt-4 text-4xl font-bold tracking-tight outline-none sm:text-5xl"
          contentEditable={!preview}
          suppressContentEditableWarning
        >
          {document.title}
        </h1>
        <p className="mt-3 text-lg leading-8 text-muted-foreground">
          {document.description}
        </p>

        <div className="mt-8 rounded-lg border bg-muted/20 p-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <span className="text-muted-foreground">Status</span>
            <span>
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-600 dark:text-blue-400">
                In progress
              </span>
            </span>
            <span className="text-muted-foreground">Category</span>
            <span>{document.category}</span>
            <span className="text-muted-foreground">Last edited</span>
            <span>{document.updatedAt}</span>
          </div>
        </div>

        <div className="mt-10 space-y-9">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2
                className="text-2xl font-semibold tracking-tight outline-none"
                contentEditable={!preview}
                suppressContentEditableWarning
              >
                {section.heading}
              </h2>
              <p
                className="mt-3 text-base leading-7 text-foreground/85 outline-none"
                contentEditable={!preview}
                suppressContentEditableWarning
              >
                {section.body}
              </p>
            </section>
          ))}
        </div>

        {!preview && (
          <div className="mt-10 border-l-2 border-muted-foreground/30 pl-4 text-sm text-muted-foreground">
            Type <kbd className="rounded border bg-muted px-1.5 py-0.5">/</kbd>{" "}
            for commands. This editor is a visual demo and does not persist
            changes.
          </div>
        )}
      </div>
    </article>
  )
}
