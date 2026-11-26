import { DatabaseWorkspace } from "@/components/productivity/database-workspace"

interface DatabasePageProps {
  params: Promise<{ id: string }>
}

export default async function DatabasePage({ params }: DatabasePageProps) {
  const { id } = await params
  return <DatabaseWorkspace databaseId={id} />
}
