export function updateBlockContent(
  content: Record<string, unknown>,
  patch: Record<string, unknown>
) {
  return { ...content, ...patch }
}
export function readBlockDraft(
  value: string,
  fallback: Record<string, unknown>
) {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : fallback
  } catch {
    return fallback
  }
}
export function moveBlockIds(ids: string[], id: string, direction: -1 | 1) {
  const next = [...ids]
  const index = next.indexOf(id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}
export function safeContentUrl(raw: unknown) {
  if (typeof raw !== "string") return null
  try {
    const url = new URL(raw)
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
