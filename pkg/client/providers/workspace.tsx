"use client"

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

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
} from "@/services/productivity"

const workspaceStorageKey = "task.current_workspace"

interface WorkspaceContextValue {
  currentUser: User | null
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
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
  const usersQuery = useUsersQuery()
  const workspacesQuery = useWorkspacesQuery()
  const pagesQuery = usePagesQuery()
  const databasesQuery = useDatabasesQuery()
  const favoritesQuery = useFavoritesQuery()
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<
    string | null
  >(null)

  const workspaces = workspacesQuery.data?.data ?? []

  useEffect(() => {
    if (!workspaces.length) {
      setSelectedWorkspaceIdState(null)
      return
    }

    const stored = window.localStorage.getItem(workspaceStorageKey)
    const nextWorkspaceId = workspaces.some(
      (workspace) => workspace.id === stored
    )
      ? stored
      : workspaces[0]?.id

    setSelectedWorkspaceIdState(nextWorkspaceId ?? null)
  }, [workspaces])

  const setSelectedWorkspaceId = (workspaceId: string) => {
    window.localStorage.setItem(workspaceStorageKey, workspaceId)
    setSelectedWorkspaceIdState(workspaceId)
  }

  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaceId = selectedWorkspaceId

    return {
      currentUser: usersQuery.data?.data[0] ?? null,
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
        databasesQuery.isLoading ||
        favoritesQuery.isLoading,
      isError:
        usersQuery.isError ||
        workspacesQuery.isError ||
        pagesQuery.isError ||
        databasesQuery.isError ||
        favoritesQuery.isError,
    }
  }, [
    databasesQuery.data,
    databasesQuery.isError,
    databasesQuery.isLoading,
    favoritesQuery.data,
    favoritesQuery.isError,
    favoritesQuery.isLoading,
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
