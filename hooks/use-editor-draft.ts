"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const dirtyKeys = new Set<string>()
function warnNavigation(event: MouseEvent) {
  if (
    !dirtyKeys.size ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return
  const link =
    event.target instanceof Element
      ? (event.target.closest("a[href]") as HTMLAnchorElement | null)
      : null
  if (
    !link ||
    link.hasAttribute("download") ||
    link.target === "_blank" ||
    link.origin !== location.origin ||
    (link.pathname === location.pathname && link.search === location.search)
  )
    return
  if (
    !window.confirm(
      "There are unsaved changes. Leave this page? Your local draft will be retained."
    )
  ) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
}
interface Draft {
  key: string
  value: string
  base: string
  version: number
  error: string
  saving: boolean
}
export function useEditorDraft(
  source: string,
  version: number,
  key: string,
  saveValue: (value: string, version: number) => Promise<{ version: number }>,
  enabled = true
) {
  const [stored, setState] = useState<Draft>({
    key,
    value: source,
    base: source,
    version,
    error: "",
    saving: false,
  })
  const state = useMemo(
    () =>
      stored.key === key
        ? stored
        : {
            key,
            value: source,
            base: source,
            version,
            error: "",
            saving: false,
          },
    [stored, key, source, version]
  )
  const stateRef = useRef(state)
  const saveRef = useRef(saveValue)
  const undoRef = useRef<string[]>([])
  const redoRef = useRef<string[]>([])
  useEffect(() => {
    stateRef.current = state
    saveRef.current = saveValue
  }, [state, saveValue])
  useEffect(() => {
    setState((current) =>
      current.value === current.base
        ? { ...current, value: source, base: source, version }
        : current.version === version
          ? current
          : {
              ...current,
              error:
                "Document changed elsewhere. Your draft is retained; reload and compare before retrying.",
            }
    )
  }, [source, version])
  useEffect(() => {
    undoRef.current = []
    redoRef.current = []
    setState({
      key,
      value: source,
      base: source,
      version,
      error: "",
      saving: false,
    })
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const draft = JSON.parse(raw) as { value: unknown; version: unknown }
      if (typeof draft.value === "string" && typeof draft.version === "number")
        setState((current) => ({
          ...current,
          value: draft.value as string,
          version: draft.version as number,
          error:
            draft.version === version
              ? "Restored an unsaved local draft"
              : "Local draft has an older version; compare before saving",
        }))
    } catch {
      /* Storage may be unavailable; editing still works online. */
    }
    // Restore once per account/entity; source/version changes are handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const setValue = useCallback((value: string) => {
    undoRef.current = [...undoRef.current.slice(-49), stateRef.current.value]
    redoRef.current = []
    setState((current) => ({ ...current, value, error: "" }))
  }, [])
  const undo = useCallback(() => {
    const value = undoRef.current.pop()
    if (value === undefined) return
    redoRef.current.push(stateRef.current.value)
    setState((current) => ({ ...current, value }))
  }, [])
  const redo = useCallback(() => {
    const value = redoRef.current.pop()
    if (value === undefined) return
    undoRef.current.push(stateRef.current.value)
    setState((current) => ({ ...current, value }))
  }, [])
  const save = useCallback(async () => {
    const current = stateRef.current
    if (
      !enabled ||
      current.key !== key ||
      current.saving ||
      current.value === current.base
    )
      return
    setState((value) => ({ ...value, saving: true, error: "" }))
    stateRef.current = { ...current, saving: true }
    try {
      const result = await saveRef.current(current.value, current.version)
      setState((value) =>
        value.key === key
          ? {
              ...value,
              base: current.value,
              version: result.version,
              saving: false,
              error: "",
            }
          : value
      )
      try {
        if (stateRef.current.value === current.value)
          localStorage.removeItem(key)
      } catch {
        /* Optional offline storage. */
      }
    } catch (error) {
      setState((value) =>
        value.key === key
          ? {
              ...value,
              saving: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Save failed. Your draft is retained.",
            }
          : value
      )
    }
  }, [key, enabled])
  const dirty = state.value !== state.base
  useEffect(() => {
    if (!dirty || !enabled) return
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ value: state.value, version: state.version })
      )
    } catch {
      /* Quota/private mode. */
    }
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    dirtyKeys.add(key)
    document.addEventListener("click", warnNavigation, true)
    window.addEventListener("beforeunload", warn)
    // Offline drafts never bypass server authorization or optimistic versions.
    const online = () => {
      if (!stateRef.current.error) void save()
    }
    window.addEventListener("online", online)
    const timer = state.error
      ? undefined
      : window.setTimeout(() => void save(), 800)
    return () => {
      dirtyKeys.delete(key)
      if (!dirtyKeys.size)
        document.removeEventListener("click", warnNavigation, true)
      clearTimeout(timer)
      window.removeEventListener("beforeunload", warn)
      window.removeEventListener("online", online)
    }
  }, [
    dirty,
    state.value,
    state.base,
    state.version,
    state.error,
    key,
    save,
    enabled,
  ])
  const discard = () => {
    setState({
      key,
      value: source,
      base: source,
      version,
      error: "",
      saving: false,
    })
    try {
      localStorage.removeItem(key)
    } catch {
      /* Optional storage. */
    }
  }
  const rebase = () => {
    if (!enabled || stateRef.current.saving) return
    setState((current) => ({ ...current, base: source, version, error: "" }))
  }
  return {
    ...state,
    dirty,
    setValue,
    save,
    undo,
    redo,
    discard,
    rebase,
    latestSource: source,
    latestVersion: version,
  }
}
