import { PageEditor } from "@/components/productivity/page-editor"

interface DocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params

  return <PageEditor pageId={id} />
}
