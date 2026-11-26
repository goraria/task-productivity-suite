"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react"

import { useAuth } from "@/hooks/use-auth"
import type {
  Database,
  Favorite,
  Page,
  User,
  Workspace,
} from "@/lib/productivity"
import {
  useDatabasesQuery,
  useFavoritesQuery,
  usePagesQuery,
  useUsersQuery,
  useWorkspacesQuery,
} from "@/queries/productivity"

const workspaceStorageKey = "task.current_workspace"
function subscribeWorkspace(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(workspaceStorageKey, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(workspaceStorageKey, callback)
  }
}
const emptyWorkspace = () => null

interface WorkspaceContextValue {
  currentUser: User | null
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  pageCount: number
  databaseCount: number
  pages: Page[]
  databases: Database[]
  favorites: Favorite[]
  selectedWorkspaceId: string | null
  setSelectedWorkspaceId: (workspaceId: string) => void
  isLoading: boolean
  isError: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const auth = useAuth()
  const usersQuery = useUsersQuery()
  const workspacesQuery = useWorkspacesQuery()
  const favoritesQuery = useFavoritesQuery()
  const storageKey = workspaceStorageKey + "." + auth.account?.id
  const storedWorkspace = useSyncExternalStore(
    subscribeWorkspace,
    () => window.localStorage.getItem(storageKey),
    emptyWorkspace
  )
  const workspaces = useMemo(
    () => workspacesQuery.data?.data ?? [],
    [workspacesQuery.data]
  )
  const selectedWorkspaceId = workspaces.some((w) => w.id === storedWorkspace)
    ? storedWorkspace
    : (workspaces[0]?.id ?? null)

  const pagesQuery = usePagesQuery({
    workspaceId: selectedWorkspaceId ?? undefined,
    enabled: Boolean(selectedWorkspaceId),
  })
  const databasesQuery = useDatabasesQuery({
    workspaceId: selectedWorkspaceId ?? undefined,
    enabled: Boolean(selectedWorkspaceId),
  })

  const setSelectedWorkspaceId = useCallback(
    (workspaceId: string) => {
      window.localStorage.setItem(storageKey, workspaceId)
      window.dispatchEvent(new Event(workspaceStorageKey))
    },
    [storageKey]
  )

  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaceId = selectedWorkspaceId

    return {
      pageCount: pagesQuery.data?.pagination.total ?? 0,
      databaseCount: databasesQuery.data?.pagination.total ?? 0,
      currentUser:
        usersQuery.data?.data.find(
          (u) => u.externalUserId === auth.account?.id
        ) ?? null,
      workspaces,
      currentWorkspace:
        workspaces.find((workspace) => workspace.id === workspaceId) ?? null,
      pages: (pagesQuery.data?.data ?? []).filter(
        (page) => page.workspaceId === workspaceId && !page.isArchived
      ),
      databases: (databasesQuery.data?.data ?? []).filter(
        (database) =>
          database.workspaceId === workspaceId && !database.isArchived
      ),
      favorites: (favoritesQuery.data?.data ?? []).filter(
        (favorite) => favorite.workspaceId === workspaceId
      ),
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      isLoading:
        usersQuery.isLoading ||
        workspacesQuery.isLoading ||
        pagesQuery.isLoading ||
        databasesQuery.isLoading,
      isError:
        usersQuery.isError ||
        workspacesQuery.isError ||
        pagesQuery.isError ||
        databasesQuery.isError,
    }
  }, [
    auth.account?.id,
    setSelectedWorkspaceId,
    databasesQuery.data,
    databasesQuery.isError,
    databasesQuery.isLoading,
    favoritesQuery.data,
    pagesQuery.data,
    pagesQuery.isError,
    pagesQuery.isLoading,
    selectedWorkspaceId,
    usersQuery.data,
    usersQuery.isError,
    usersQuery.isLoading,
    workspaces,
    workspacesQuery.isError,
    workspacesQuery.isLoading,
  ])

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context)
    throw new Error("useWorkspace must be used within WorkspaceProvider")
  return context
}
