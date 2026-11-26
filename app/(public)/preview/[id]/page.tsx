import { PublishedBlocks } from "@/components/productivity/published-blocks"
import { CrudError } from "@/database/crud"
import { rawGetPublishedDocument } from "@/models/document-revision"
import { z } from "@gorth-com/structure/cores/zod"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
export default async function PublishedDocument({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const parsed = z.uuid().safeParse((await params).id)
  if (!parsed.success) notFound()
  let document
  try {
    document = await rawGetPublishedDocument(parsed.data)
  } catch (error) {
    if (error instanceof CrudError && error.status === 404) notFound()
    throw error
  }
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <h1 className="text-4xl font-bold">
        {document.icon} {document.title}
      </h1>
      <PublishedBlocks blocks={document.blocks} />
    </main>
  )
}
