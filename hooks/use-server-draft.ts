"use client"
import { useCallback, useState } from "react"
export function useServerDraft<T>(source: T) {
  const [draft, setDraft] = useState<{ source: T; value: T } | null>(null)
  const setValue = useCallback(
    (value: T) => setDraft({ source, value }),
    [source]
  )
  return [
    draft && Object.is(draft.source, source) ? draft.value : source,
    setValue,
  ] as const
}
