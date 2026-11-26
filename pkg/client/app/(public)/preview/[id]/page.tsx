import { DocumentEditorDemo } from "@/components/document-editor-demo"
import { getDemoDocument } from "@/utils/document-demo"

interface DocumentPreviewPageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentPreviewPage({ params }: DocumentPreviewPageProps) {
  const { id } = await params

  return <DocumentEditorDemo document={getDemoDocument(id)} preview />
}
