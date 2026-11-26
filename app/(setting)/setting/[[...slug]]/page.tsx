import type { SettingPageProps } from "@/utils/interface"

export default async function SettingPage({ params }: SettingPageProps) {
  const { slug = [] } = await params
  const title = slug.length ? slug.join(" / ") : "setting"

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold capitalize">{title}</h1>
      <p className="text-muted-foreground">
        Manage preferences specific to the productivity suite.
      </p>
    </section>
  )
}
