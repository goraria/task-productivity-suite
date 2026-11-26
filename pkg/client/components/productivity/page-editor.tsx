"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckSquare,
  FilePlus2,
  Heading1,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Quote,
  Share2,
  Star,
  Trash2,
  Type,
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth/primitive/default/card"
import { Input } from "@gorth/primitive/default/input"
import { Separator } from "@gorth/primitive/default/separator"
import { Textarea } from "@gorth/primitive/default/textarea"

import type { Block, BlockType } from "@/lib/productivity"
import { formatRelativeDate } from "@/utils/formatter"
import { useWorkspace } from "@/providers/workspace"
import {
  useBlocksQuery,
  useCommentsQuery,
  useCreateBlockMutation,
  useCreateCommentMutation,
  useCreateFavoriteMutation,
  useCreateFileMutation,
  useCreatePermissionMutation,
  useDeleteBlockMutation,
  useDeleteCommentMutation,
  useDeleteFavoriteMutation,
  useFavoritesQuery,
  useFilesQuery,
  usePageQuery,
  usePermissionsQuery,
  useUpdateBlockMutation,
  useUpdatePageMutation,
} from "@/services/productivity"
import {
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/productivity/workspace-state"

interface PageEditorProps {
  pageId: string
}

interface BlockEditorProps {
  block: Block
  onDelete: (id: string) => void
}

function readBlockText(content: Record<string, unknown>) {
  const value = content.text ?? content.content ?? ""
  return typeof value === "string" ? value : ""
}

function BlockEditor({ block, onDelete }: BlockEditorProps) {
  const [text, setText] = useState(() => readBlockText(block.content))
  const [updateBlock] = useUpdateBlockMutation()

  useEffect(() => setText(readBlockText(block.content)), [block.content])

  const save = () => {
    if (text === readBlockText(block.content)) return
    void updateBlock({ id: block.id, body: { content: { text } } }).unwrap()
  }

  const commonClassName =
    "min-h-10 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"

  return (
    <div className="group/block hover:bg-muted/40 flex items-start gap-1 rounded-md">
      {block.type === "todo" && (
        <input
          type="checkbox"
          aria-label="Complete block"
          className="border-input accent-primary mt-3 size-4 rounded"
        />
      )}
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={save}
        rows={block.type.startsWith("heading") ? 1 : 2}
        placeholder="Type something..."
        className={
          block.type === "heading_1"
            ? `${commonClassName} text-3xl font-semibold`
            : block.type === "heading_2"
              ? `${commonClassName} text-2xl font-semibold`
              : block.type === "heading_3"
                ? `${commonClassName} text-xl font-semibold`
                : block.type === "quote"
                  ? `${commonClassName} border-l-2 pl-4 italic`
                  : block.type === "callout"
                    ? `${commonClassName} bg-muted rounded-md p-3`
                    : commonClassName
        }
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete block"
        className="mt-0.5 opacity-0 group-hover/block:opacity-100"
        onClick={() => onDelete(block.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export function PageEditor({ pageId }: PageEditorProps) {
  const pageQuery = usePageQuery(pageId)
  const blocksQuery = useBlocksQuery()
  const commentsQuery = useCommentsQuery()
  const filesQuery = useFilesQuery()
  const permissionsQuery = usePermissionsQuery()
  const favoritesQuery = useFavoritesQuery()
  const { currentUser } = useWorkspace()
  const [title, setTitle] = useState("")
  const [panel, setPanel] = useState<"comments" | "files" | "share" | null>(
    null
  )
  const [comment, setComment] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [updatePage] = useUpdatePageMutation()
  const [createBlock, createBlockState] = useCreateBlockMutation()
  const [updateBlock] = useUpdateBlockMutation()
  const [deleteBlock] = useDeleteBlockMutation()
  const [createComment, createCommentState] = useCreateCommentMutation()
  const [deleteComment] = useDeleteCommentMutation()
  const [createFile, createFileState] = useCreateFileMutation()
  const [createPermission, createPermissionState] =
    useCreatePermissionMutation()
  const [createFavorite] = useCreateFavoriteMutation()
  const [deleteFavorite] = useDeleteFavoriteMutation()

  const page = pageQuery.data
  useEffect(() => setTitle(page?.title ?? ""), [page?.title])

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

  const saveTitle = () => {
    const nextTitle = title.trim() || "Untitled"
    setTitle(nextTitle)
    if (nextTitle !== page.title) {
      void updatePage({ id: page.id, body: { title: nextTitle } }).unwrap()
    }
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
    await deleteBlock(id).unwrap()
  }

  const moveBlock = async (block: Block, position: number) => {
    await updateBlock({ id: block.id, body: { position } }).unwrap()
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

  const attachFile = async () => {
    if (!fileUrl.trim()) return
    const name = fileUrl.split("/").filter(Boolean).at(-1) ?? "Attachment"
    await createFile({
      workspaceId: page.workspaceId,
      pageId: page.id,
      name,
      mimeType: "application/octet-stream",
      size: 0,
      url: fileUrl.trim(),
    }).unwrap()
    setFileUrl("")
  }

  const publishPage = async () => {
    await createPermission({
      workspaceId: page.workspaceId,
      pageId: page.id,
      subjectType: "public",
      level: "view",
    }).unwrap()
    await updatePage({
      id: page.id,
      body: { isPublished: true, publishedAt: new Date().toISOString() },
    }).unwrap()
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
                onClick={toggleFavorite}
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
                onClick={() => setPanel(panel === "share" ? null : "share")}
              >
                <Share2 className="size-4" />
                Share
              </Button>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </div>

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
                <BlockEditor block={block} onDelete={removeBlock} />
                <div className="sr-only">
                  <button
                    type="button"
                    onClick={() => moveBlock(block, index - 1)}
                  >
                    Move up
                  </button>
                </div>
              </div>
            ))}
          </div>

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
            ].map((item) => (
              <Button
                key={item.type}
                variant="ghost"
                onClick={() => addBlock(item.type)}
                disabled={createBlockState.isLoading}
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
                placeholder="Leave a comment..."
              />
              <Button
                className="w-full"
                onClick={submitComment}
                disabled={!comment.trim() || createCommentState.isLoading}
              >
                <MessageSquare className="size-4" />
                Comment
              </Button>
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
                        onClick={() => deleteComment(item.id).unwrap()}
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
              <Input
                value={fileUrl}
                onChange={(event) => setFileUrl(event.target.value)}
                placeholder="Paste attachment URL"
              />
              <Button
                className="w-full"
                onClick={attachFile}
                disabled={!fileUrl.trim() || createFileState.isLoading}
              >
                <Paperclip className="size-4" />
                Attach
              </Button>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {panel === "share" && (
            <div className="space-y-4">
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
                onClick={publishPage}
                disabled={page.isPublished || createPermissionState.isLoading}
              >
                <Link2 className="size-4" />
                {page.isPublished ? "Published" : "Publish to web"}
              </Button>
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
