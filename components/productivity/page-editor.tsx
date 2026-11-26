"use client"
import { DocumentPresence } from "@/components/productivity/document-presence"
import type { WorkspaceDirectory } from "@/components/productivity/member-management"
import { useEditorDraft } from "@/hooks/use-editor-draft"
import { useDocumentBlocks } from "@/queries/document-blocks"
import { uploadDocumentFile } from "@/queries/document-media"
import {
  downloadDocument,
  useDocumentPublication,
  useDocumentRevisions,
  useReorderBlocks,
  useRestoreRevision,
} from "@/queries/documents"
import { useAttachmentBuckets } from "@/queries/media-buckets"
import { platformMutation, usePlatformQuery } from "@/queries/platform"
import { caller } from "@/utils/caller"
import {
  moveBlockIds,
  readBlockDraft,
  safeContentUrl,
  updateBlockContent,
} from "@/utils/editor"

import {
  CheckSquare,
  FilePlus2,
  Heading1,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Quote,
  Share2,
  Star,
  Trash2,
  Type,
} from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { Separator } from "@gorth-com/primitive/default/separator"
import { Textarea } from "@gorth-com/primitive/default/textarea"
import { useCallback, useMemo, useRef, useState } from "react"

import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"
import type { Block, BlockType } from "@/lib/productivity"
import { useWorkspace } from "@/providers/workspace"
import {
  useCommentsQuery,
  useCreateBlockMutation,
  useCreateCommentMutation,
  useCreateFavoriteMutation,
  useCreatePermissionMutation,
  useDeleteCommentMutation,
  useDeleteFavoriteMutation,
  useDeleteFileMutation,
  useFavoritesQuery,
  useFilesQuery,
  usePageQuery,
  usePermissionsQuery,
  useUpdateBlockMutation,
  useUpdatePageMutation,
} from "@/queries/productivity"
import { formatRelativeDate } from "@/utils/formatter"

interface PageEditorProps {
  pageId: string
}

interface BlockEditorProps {
  block: Block
  onDelete: (id: string) => void
  readOnly?: boolean
}

function readBlockText(content: Record<string, unknown>) {
  const value = content.text ?? content.content ?? ""
  return typeof value === "string" ? value : ""
}

function BlockEditor({ block, onDelete, readOnly = false }: BlockEditorProps) {
  const { currentUser } = useWorkspace()
  const [updateBlock] = useUpdateBlockMutation()
  const draft = useEditorDraft(
    JSON.stringify(block.content),
    block.version,
    `task.draft.${currentUser?.externalUserId}.${block.id}`,
    async (value, version) => {
      const result = await updateBlock({
        id: block.id,
        body: { content: JSON.parse(value), version },
      }).unwrap()
      return { version: result.version }
    },
    !readOnly
  )
  const content = readBlockDraft(draft.value, block.content)
  const text = readBlockText(content)
  const patch = (value: Record<string, unknown>) =>
    draft.setValue(JSON.stringify(updateBlockContent(content, value)))
  const url = safeContentUrl(content.url)
  if (block.type === "divider")
    return (
      <div className="flex items-center gap-2">
        <Separator className="my-4 flex-1" />
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete divider"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    )
  return (
    <div className="group/block space-y-1 rounded-md border border-transparent p-1 hover:border-border">
      <div className="flex items-start gap-2">
        {block.type === "todo" && (
          <input
            type="checkbox"
            checked={content.checked === true}
            disabled={readOnly}
            onChange={(event) => patch({ checked: event.target.checked })}
            aria-label="Complete block"
            className="mt-3 size-4 accent-primary"
          />
        )}
        <Textarea
          value={text}
          readOnly={readOnly}
          onChange={(event) => patch({ text: event.target.value })}
          onBlur={() => void draft.save()}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "z") {
              event.preventDefault()
              if (event.shiftKey) draft.redo()
              else draft.undo()
            }
          }}
          rows={block.type.startsWith("heading") ? 1 : 2}
          placeholder="Type something..."
          className={`min-h-10 resize-y border-0 shadow-none focus-visible:ring-0 ${block.type.startsWith("heading") ? "text-2xl font-bold" : block.type === "code" ? "bg-muted font-mono" : block.type === "quote" ? "border-l-2 italic" : ""}`}
        />
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete block"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      {["bookmark", "embed", "image", "video", "file"].includes(block.type) && (
        <div className="space-y-2">
          <Input
            aria-label="Content URL"
            value={String(content.url ?? "")}
            readOnly={readOnly}
            onChange={(event) => patch({ url: event.target.value })}
            onBlur={() => void draft.save()}
          />
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Open linked content
            </a>
          )}
        </div>
      )}
      {!readOnly && (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>
            {draft.error ||
              (draft.saving
                ? "Saving…"
                : draft.dirty
                  ? "Unsaved draft"
                  : "Saved")}
          </span>
          {draft.error && (
            <>
              <Button variant="ghost" onClick={() => void draft.save()}>
                Retry save
              </Button>
              <Button variant="ghost" onClick={draft.discard}>
                Discard local draft
              </Button>
              {draft.latestVersion !== draft.version && (
                <details className="max-w-full">
                  <summary>Compare latest version</summary>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap">
                    {draft.latestSource}
                  </pre>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace the latest saved block with your local draft?"
                        )
                      )
                        draft.rebase()
                    }}
                  >
                    Apply draft to latest version
                  </Button>
                </details>
              )}
            </>
          )}
          <Button variant="ghost" onClick={draft.undo}>
            Undo
          </Button>
          <Button variant="ghost" onClick={draft.redo}>
            Redo
          </Button>
        </div>
      )}
    </div>
  )
}

export function PageEditor({ pageId }: PageEditorProps) {
  const pageQuery = usePageQuery(pageId)
  const blocksQuery = useDocumentBlocks(pageId)
  const commentsQuery = useCommentsQuery(pageId)
  const filesQuery = useFilesQuery({ pageId })
  const permissionsQuery = usePermissionsQuery({ pageId })
  const favoritesQuery = useFavoritesQuery()
  const { currentUser } = useWorkspace()
  const [revisionOffset, setRevisionOffset] = useState(0)
  const [panel, setPanel] = useState<
    "comments" | "files" | "share" | "history" | null
  >(null)
  const directory = usePlatformQuery<WorkspaceDirectory>(
    `/task/workspace/${pageQuery.data?.workspaceId}/directory`,
    undefined,
    Boolean(pageQuery.data?.workspaceId)
  )
  const [grantUser, setGrantUser] = useState("")
  const [grantLevel, setGrantLevel] = useState("view")
  const [operationError, setOperationError] = useState("")
  const [comment, setComment] = useState("")
  const bucketsQuery = useAttachmentBuckets()
  const [bucketId, setBucketId] = useState("")
  const [uploading, setUploading] = useState(false)
  const uploadController = useRef<AbortController | null>(null)
  const [parentId, setParentId] = useState("")
  const parentCandidates = usePlatformQuery<{
    data: { id: string; title: string }[]
  }>(
    "/task/page",
    { workspaceId: pageQuery.data?.workspaceId ?? "", limit: 100 },
    Boolean(pageQuery.data?.workspaceId)
  )
  const [uploadError, setUploadError] = useState("")
  const attempt = async (operation: () => Promise<unknown>) => {
    setOperationError("")
    try {
      await operation()
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "Operation failed"
      )
    }
  }
  const [updatePage] = useUpdatePageMutation()
  const titleDraft = useEditorDraft(
    pageQuery.data?.title ?? "",
    pageQuery.data?.version ?? 1,
    `task.draft.${currentUser?.externalUserId}.${pageId}.title`,
    async (value, version) => {
      const result = await updatePage({
        id: pageId,
        body: { title: value.trim() || "Untitled", version },
      }).unwrap()
      return { version: result.version }
    },
    (pageQuery.data?.accessLevel ?? 0) >= 3
  )
  const title = titleDraft.value
  const setTitle = titleDraft.setValue
  const revisionsQuery = useDocumentRevisions(
    panel === "history" ? pageId : "",
    revisionOffset
  )
  const [restoreRevision] = useRestoreRevision()
  const [reorderBlocks] = useReorderBlocks()
  const [setPublication] = useDocumentPublication()
  const [createBlock, createBlockState] = useCreateBlockMutation()
  const [updateBlock] = useUpdateBlockMutation()
  const [createComment, createCommentState] = useCreateCommentMutation()
  const [deleteComment] = useDeleteCommentMutation()
  const [deleteFile] = useDeleteFileMutation()
  const [createPermission, createPermissionState] =
    useCreatePermissionMutation()
  const [createFavorite] = useCreateFavoriteMutation()
  const [deleteFavorite] = useDeleteFavoriteMutation()

  const { refetch: refetchPage } = pageQuery
  const { refetch: refetchBlocks } = blocksQuery
  const refreshDocument = useCallback(() => {
    void refetchPage()
    void refetchBlocks()
  }, [refetchPage, refetchBlocks])
  const page = pageQuery.data

  const blocks = useMemo(
    () =>
      (blocksQuery.data?.data ?? [])
        .filter((block) => block.pageId === pageId && !block.isArchived)
        .sort((first, second) => first.position - second.position),
    [blocksQuery.data, pageId]
  )
  const comments = (commentsQuery.data?.data ?? []).filter(
    (item) => item.pageId === pageId
  )
  const files = (filesQuery.data?.data ?? []).filter(
    (item) => item.pageId === pageId
  )
  const permissions = (permissionsQuery.data?.data ?? []).filter(
    (item) => item.pageId === pageId
  )
  const favorite = (favoritesQuery.data?.data ?? []).find(
    (item) => item.pageId === pageId && item.userId === currentUser?.id
  )

  if (pageQuery.isLoading || blocksQuery.isLoading) return <WorkspaceLoading />
  if (pageQuery.isError || blocksQuery.isError || !page)
    return <WorkspaceError />

  const canEdit = (page.accessLevel ?? 0) >= 3
  const canManage = (page.accessLevel ?? 0) >= 4
  const saveTitle = () => {
    void titleDraft.save()
  }

  const addBlock = async (type: BlockType) => {
    await createBlock({
      workspaceId: page.workspaceId,
      pageId: page.id,
      type,
      content: { text: "" },
      position: blocks.length,
    }).unwrap()
  }

  const removeBlock = async (id: string) => {
    const block = blocks.find((item) => item.id === id)
    if (block)
      await updateBlock({
        id,
        body: { isArchived: true, version: block.version },
      }).unwrap()
  }

  const moveBlock = async (block: Block, direction: -1 | 1) => {
    await reorderBlocks({
      id: page.id,
      ids: moveBlockIds(
        blocks.map((item) => item.id),
        block.id,
        direction
      ),
    }).unwrap()
  }

  const toggleFavorite = async () => {
    if (!currentUser) return
    if (favorite) {
      await deleteFavorite({
        firstId: favorite.userId,
        secondId: favorite.pageId,
      }).unwrap()
      return
    }
    await createFavorite({
      workspaceId: page.workspaceId,
      pageId: page.id,
      position: 0,
    }).unwrap()
  }

  const submitComment = async () => {
    if (!comment.trim()) return
    await createComment({
      workspaceId: page.workspaceId,
      pageId: page.id,
      content: comment.trim(),
    }).unwrap()
    setComment("")
  }

  const attachFile = async (file: File) => {
    const bucket =
      bucketId ||
      bucketsQuery.data?.find((item) =>
        item.allowedTypes.includes("attachment")
      )?.id
    if (!bucket) {
      setUploadError("No attachment storage is configured")
      return
    }
    setUploading(true)
    setUploadError("")
    try {
      uploadController.current = new AbortController()
      await uploadDocumentFile(
        pageId,
        bucket,
        file,
        uploadController.current.signal
      )
      await filesQuery.refetch()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
      uploadController.current = null
    }
  }

  const publishPage = async () => {
    await setPublication({ id: page.id, published: !page.isPublished }).unwrap()
  }

  return (
    <div className="flex min-h-full">
      <main className="min-w-0 flex-1">
        {page.cover && (
          <div
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url(${page.cover})` }}
          />
        )}
        <div className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-12 lg:py-12">
          {currentUser && (
            <DocumentPresence
              pageId={pageId}
              subject={currentUser.externalUserId}
              onRefresh={refreshDocument}
            />
          )}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Badge variant="default">Document</Badge>
              <span>Edited {formatRelativeDate(page.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Favorite page"
                onClick={() => void attempt(toggleFavorite)}
              >
                <Star className={`size-4 ${favorite ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Comments"
                onClick={() =>
                  setPanel(panel === "comments" ? null : "comments")
                }
              >
                <MessageSquare className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Files"
                onClick={() => setPanel(panel === "files" ? null : "files")}
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                variant="ghost"
                disabled={!canManage}
                onClick={() => setPanel(panel === "share" ? null : "share")}
              >
                <Share2 className="size-4" />
                Share
              </Button>
              <Button
                variant="ghost"
                onClick={() => void attempt(() => downloadDocument(page.id))}
              >
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Document history"
                onClick={() => setPanel("history")}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              disabled={!canEdit}
              aria-label="Move page under"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="h-9 max-w-64 rounded-md border bg-background px-3"
            >
              <option value="">Workspace root</option>
              {parentCandidates.data?.data
                .filter((item) => item.id !== page.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>
            <Button
              variant="outline"
              disabled={!canEdit || titleDraft.dirty || titleDraft.saving}
              onClick={() =>
                void attempt(async () => {
                  await updatePage({
                    id: page.id,
                    body: {
                      parentPageId: parentId || null,
                      version: page.version,
                    },
                  }).unwrap()
                })
              }
            >
              Move
            </Button>
            <Button
              variant="outline"
              disabled={!canEdit || titleDraft.dirty || titleDraft.saving}
              onClick={() =>
                void attempt(async () => {
                  await updatePage({
                    id: page.id,
                    body: {
                      isArchived: !page.isArchived,
                      version: page.version,
                    },
                  }).unwrap()
                })
              }
            >
              {page.isArchived ? "Restore document" : "Archive document"}
            </Button>
            {page.isArchived && (
              <span role="status" className="text-sm text-muted-foreground">
                This document is archived.
              </span>
            )}
          </div>
          <p role="alert" className="text-sm text-destructive">
            {operationError}
          </p>
          <p className="text-xs text-muted-foreground" role="status">
            {titleDraft.error ||
              (titleDraft.saving
                ? "Saving title…"
                : titleDraft.dirty
                  ? "Unsaved title"
                  : "Saved")}
          </p>
          {titleDraft.error && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!canEdit}
                onClick={() => void titleDraft.save()}
              >
                Retry title save
              </Button>
              <Button variant="ghost" onClick={titleDraft.discard}>
                Discard title draft
              </Button>
              {titleDraft.latestVersion !== titleDraft.version && (
                <details>
                  <summary>Latest title: {titleDraft.latestSource}</summary>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace the latest title with your local draft?"
                        )
                      )
                        titleDraft.rebase()
                    }}
                  >
                    Apply draft to latest version
                  </Button>
                </details>
              )}
            </div>
          )}
          <div className="mb-8">
            <button
              type="button"
              aria-label="Change page icon"
              className="mb-3 text-6xl"
            >
              {page.icon ?? "📄"}
            </button>
            <Textarea
              value={title}
              readOnly={!canEdit}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveTitle}
              rows={1}
              className="min-h-16 resize-none border-0 px-0 text-5xl font-bold tracking-tight shadow-none focus-visible:ring-0"
              placeholder="Untitled"
            />
          </div>

          <div className="space-y-1">
            {blocks.map((block, index) => (
              <div key={block.id}>
                <BlockEditor
                  block={block}
                  onDelete={(id) => void attempt(() => removeBlock(id))}
                  readOnly={!canEdit}
                />
                {canEdit && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      disabled={blocksQuery.hasNextPage || index === 0}
                      onClick={() => void attempt(() => moveBlock(block, -1))}
                    >
                      Move up
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={
                        blocksQuery.hasNextPage || index === blocks.length - 1
                      }
                      onClick={() => void attempt(() => moveBlock(block, 1))}
                    >
                      Move down
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {blocksQuery.hasNextPage && (
            <Button
              variant="outline"
              disabled={blocksQuery.isFetchingNextPage}
              onClick={() => void blocksQuery.fetchNextPage()}
            >
              Load more blocks
            </Button>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-1 border-t pt-4">
            <span className="text-muted-foreground mr-2 text-xs">
              Add block
            </span>
            {[
              { type: "text" as const, label: "Text", icon: Type },
              { type: "heading_1" as const, label: "Heading", icon: Heading1 },
              { type: "todo" as const, label: "To-do", icon: CheckSquare },
              { type: "quote" as const, label: "Quote", icon: Quote },
              { type: "callout" as const, label: "Callout", icon: FilePlus2 },
              { type: "code" as const, label: "Code", icon: Type },
              { type: "bulleted_list" as const, label: "List", icon: Type },
              { type: "numbered_list" as const, label: "Numbered", icon: Type },
              { type: "toggle" as const, label: "Toggle", icon: Type },
              { type: "divider" as const, label: "Divider", icon: Type },
              { type: "bookmark" as const, label: "Bookmark", icon: Link2 },
              { type: "embed" as const, label: "Embed", icon: Link2 },
            ].map((item) => (
              <Button
                key={item.type}
                variant="ghost"
                onClick={() => void attempt(() => addBlock(item.type))}
                disabled={!canEdit || createBlockState.isLoading}
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </main>

      {panel && (
        <aside className="bg-muted/20 w-80 shrink-0 border-l p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold capitalize">{panel}</h2>
            <Button variant="ghost" size="icon" onClick={() => setPanel(null)}>
              <MoreHorizontal className="size-4" />
            </Button>
          </div>

          {panel === "comments" && (
            <div className="space-y-4">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={(page.accessLevel ?? 0) < 2}
                placeholder="Leave a comment..."
              />
              <Button
                className="w-full"
                onClick={() => {
                  void submitComment().catch((error) =>
                    setOperationError(String(error))
                  )
                }}
                disabled={
                  (page.accessLevel ?? 0) < 2 ||
                  !comment.trim() ||
                  createCommentState.isLoading
                }
              >
                <MessageSquare className="size-4" />
                Comment
              </Button>
              <p role="alert" className="text-sm text-destructive">
                {operationError ||
                  (commentsQuery.isError
                    ? "Comments are unavailable. Your document remains editable."
                    : "")}
              </p>
              <Separator />
              {comments.map((item) => (
                <Card key={item.id}>
                  <CardContent className="space-y-2 p-3">
                    <p className="text-sm">{item.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeDate(item.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete comment"
                        onClick={() =>
                          void attempt(() =>
                            deleteComment({ id: item.id, pageId }).unwrap()
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {panel === "files" && (
            <div className="space-y-4">
              <select
                aria-label="Attachment storage"
                value={bucketId}
                onChange={(event) => setBucketId(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3"
              >
                <option value="">Choose storage</option>
                {(bucketsQuery.data ?? [])
                  .filter((item) => item.allowedTypes.includes("attachment"))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <Input
                type="file"
                aria-label="Upload attachment"
                disabled={!canEdit || uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void attachFile(file)
                  event.target.value = ""
                }}
              />
              <p role="status" className="text-sm text-muted-foreground">
                {uploading
                  ? "Uploading and verifying file…"
                  : uploadError ||
                    (bucketsQuery.isError
                      ? "Storage is unavailable"
                      : "Private attachments use workspace page permissions.")}
              </p>
              {uploading && (
                <Button
                  variant="outline"
                  onClick={() => uploadController.current?.abort()}
                >
                  Cancel upload
                </Button>
              )}
              {files.map((file) => (
                <Card key={file.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <FilePlus2 className="size-4 shrink-0" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-sm hover:underline"
                    >
                      {file.name}
                    </a>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        aria-label={`Unlink ${file.name}`}
                        onClick={() =>
                          void attempt(() => deleteFile(file.id).unwrap())
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {panel === "history" && (
            <div className="space-y-3">
              {revisionsQuery.isLoading && <WorkspaceLoading />}
              {revisionsQuery.isError && <WorkspaceError />}
              {(revisionsQuery.data ?? []).map((revision) => (
                <Card key={revision.id}>
                  <CardContent className="space-y-2 p-3">
                    <p>
                      {revision.entityType} · version {revision.version}
                    </p>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(revision.snapshot, null, 2)}
                    </pre>
                    <Button
                      disabled={!canEdit}
                      onClick={() =>
                        void attempt(async () => {
                          const block = blocksQuery.data?.data.find(
                            (item) => item.id === revision.entityId
                          )
                          const current =
                            revision.entityType === "block" && !block
                              ? await caller<{ data: { version: number } }>({
                                  url: `/task/block/${revision.entityId}`,
                                  method: "GET",
                                  unwrapData: false,
                                })
                              : null
                          await restoreRevision({
                            id: pageId,
                            revisionId: revision.id,
                            version:
                              revision.entityType === "page"
                                ? page.version
                                : (block?.version ??
                                  current?.data.version ??
                                  0),
                          }).unwrap()
                        })
                      }
                    >
                      Restore
                    </Button>
                  </CardContent>
                </Card>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={revisionOffset === 0}
                  onClick={() =>
                    setRevisionOffset((value) => Math.max(0, value - 20))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={(revisionsQuery.data?.length ?? 0) < 20}
                  onClick={() => setRevisionOffset((value) => value + 20)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          {panel === "share" && (
            <div className="space-y-4">
              <p className="text-sm text-destructive" role="alert">
                {operationError}
              </p>
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  setOperationError("")
                  void attempt(async () => {
                    const existing = permissions.find(
                      (rule) =>
                        rule.subjectType === "user" &&
                        rule.subjectId === grantUser
                    )
                    if (existing) {
                      await platformMutation(
                        `/task/permission/${existing.id}`,
                        { level: grantLevel },
                        "PATCH"
                      )
                      await permissionsQuery.refetch()
                    } else
                      await createPermission({
                        workspaceId: page.workspaceId,
                        pageId: page.id,
                        subjectType: "user",
                        subjectId: grantUser,
                        level: grantLevel as
                          "view" | "comment" | "edit" | "full_access",
                      }).unwrap()
                  })
                }}
              >
                <select
                  required
                  aria-label="Share with member"
                  value={grantUser}
                  onChange={(event) => setGrantUser(event.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3"
                >
                  <option value="">Choose member</option>
                  {directory.data?.data.members
                    .filter((member) => member.status === "active")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
                <select
                  aria-label="Access level"
                  value={grantLevel}
                  onChange={(event) => setGrantLevel(event.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3"
                >
                  {["view", "comment", "edit", "full_access"].map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
                <Button
                  disabled={
                    !canManage || !grantUser || createPermissionState.isLoading
                  }
                  type="submit"
                >
                  Grant access
                </Button>
              </form>
              <Button
                disabled={!canManage}
                variant="outline"
                onClick={() =>
                  void attempt(async () => {
                    await platformMutation(
                      `/task/document/${page.id}/access-mode`,
                      {
                        mode:
                          page.accessMode === "restricted"
                            ? "workspace"
                            : "restricted",
                      }
                    )
                    await pageQuery.refetch()
                    await permissionsQuery.refetch()
                  })
                }
              >
                {page.accessMode === "restricted"
                  ? "Share with workspace"
                  : "Make private"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {page.accessMode === "restricted"
                  ? "Only explicit grants, the creator and workspace managers have access."
                  : "Workspace roles provide access; individual grants can add permissions."}
              </p>
              {permissions.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    {rule.subjectType === "public"
                      ? "Public"
                      : (directory.data?.data.members.find(
                          (member) => member.id === rule.subjectId
                        )?.name ?? rule.subjectType)}{" "}
                    · {rule.level}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={!canManage}
                    onClick={() =>
                      void attempt(async () => {
                        await platformMutation(
                          `/task/permission/${rule.id}`,
                          undefined,
                          "DELETE"
                        )
                        await permissionsQuery.refetch()
                      })
                    }
                  >
                    Revoke
                  </Button>
                </div>
              ))}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Page access</CardTitle>
                  <CardDescription>
                    {permissions.length
                      ? `${permissions.length} permission rules are active.`
                      : "Only workspace members can access this page."}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Button
                className="w-full"
                onClick={() => void attempt(publishPage)}
                disabled={!canManage || createPermissionState.isLoading}
              >
                <Link2 className="size-4" />
                {page.isPublished ? "Unpublish" : "Publish to web"}
              </Button>
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
