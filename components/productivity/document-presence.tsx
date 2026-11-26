"use client"
import { useEffect, useState } from "react"
import { caller } from "@/utils/caller"
export function DocumentPresence({
  pageId,
  subject,
  onRefresh,
}: {
  pageId: string
  subject: string
  onRefresh: () => void
}) {
  const [members, setMembers] = useState<{ id: string; name: string }[]>([])
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    let stopped = false
    let pending = false
    const controller = new AbortController()
    async function refresh() {
      if (pending || document.hidden) return
      pending = true
      try {
        const result = await caller<{ data: { id: string; name: string }[] }>({
          url: `/task/document/${pageId}/presence`,
          method: "POST",
          body: {},
          unwrapData: false,
          signal: controller.signal,
        })
        if (!stopped) {
          setMembers(result.data)
          setOffline(false)
          onRefresh()
        }
      } catch {
        if (!stopped) setOffline(true)
      } finally {
        pending = false
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30000)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      stopped = true
      controller.abort()
      clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [pageId, subject, onRefresh])
  return (
    <p className="text-xs text-muted-foreground" role="status">
      {offline
        ? "Live updates unavailable. Local drafts are retained."
        : members.length
          ? `Viewing: ${members.map((member) => member.name).join(", ")}`
          : "Connecting to document…"}
    </p>
  )
}
