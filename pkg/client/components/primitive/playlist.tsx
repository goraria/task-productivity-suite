"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@gorth/primitive/cores/cn"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import {
  Globe,
  ListVideo,
  Lock,
  MoreVertical,
  Play,
  Share2,
} from "@gorth/primitive/cores/lucide"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gorth/primitive/default/tooltip"

export type PlaylistVisibility = "Private" | "Unlisted" | "Public"

export interface PlaylistVideo {
  id: string
  title: string
  channel: string
  duration: string
  thumbnail: string
  meta?: string
}

export interface PlaylistCardData {
  id: string
  title: string
  description?: string
  count: number
  visibility?: PlaylistVisibility
  updatedAt?: string
  thumbnails?: string[]
  icon?: React.ElementType
  videos?: PlaylistVideo[]
}

export interface PlaylistCardProps
  extends Omit<React.ComponentProps<"article">, "title"> {
  playlist: PlaylistCardData
  showActions?: boolean
}

function VisibilityIcon({
  visibility,
  className,
}: {
  visibility: PlaylistVisibility
  className?: string
}) {
  if (visibility === "Private") {
    return <Lock className={cn("size-3.5", className)} />
  }

  if (visibility === "Public") {
    return <Globe className={cn("size-3.5", className)} />
  }

  return <ListVideo className={cn("size-3.5", className)} />
}

export function PlaylistCard({
  playlist,
  showActions = true,
  className,
  ...props
}: PlaylistCardProps) {
  const {
    id,
    title,
    description,
    count,
    visibility = "Public",
    updatedAt,
    thumbnails = [],
    icon: Icon = ListVideo,
    videos = [],
  } = playlist

  const cover = thumbnails[0] ?? "/logo/icon.png"
  const firstVideoId = videos[0]?.id ?? "1001"
  const playHref = `/watch?id=${firstVideoId}&list=${id}`

  return (
    <article className={cn("group/playlist flex w-full flex-col text-left", className)} {...props}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted ring-1 ring-black/5 transition-transform duration-300 group-hover/playlist:-translate-y-0.5 group-hover/playlist:shadow-xl">
        <div className="absolute inset-x-4 top-2 h-full rounded-lg bg-muted/70" />
        <div className="absolute inset-x-2 top-1 h-full rounded-lg bg-muted/90" />

        <Link href={playHref} className="block h-full w-full">
          <Image
            src={cover}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover/playlist:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={false}
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent opacity-80" />

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-2 p-2">
            <Badge
              variant="secondary"
              // className="gap-1 border-0 bg-black/80 text-[10px] text-white"
            >
              <Icon className="size-3.5" />
              {count} videos
            </Badge>
            <Badge>
              <VisibilityIcon visibility={visibility} className="size-3" />
              {visibility}
            </Badge>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-300 group-hover/playlist:opacity-100">
            <span className="flex size-11 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
              <Play className="size-5 fill-current pl-0.5" />
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-3 space-y-2 px-0.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={playHref} className="inline-block">
                  <h3 className="line-clamp-1 cursor-help font-semibold leading-snug text-foreground transition-colors group-hover/playlist:text-primary">
                    {title}
                  </h3>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{title}</p>
              </TooltipContent>
            </Tooltip>

            {description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <Button variant="ghost" size="icon-sm" className="shrink-0 -mr-1">
            <MoreVertical className="size-4" />
          </Button>
        </div>

        {updatedAt ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Updated {updatedAt}</span>
          </div>
        ) : null}

        {showActions ? (
          <div className="flex items-center gap-2 pt-1">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={playHref}>Play all</Link>
            </Button>
            <Button variant="ghost" size="icon-sm">
              <Share2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function PlaylistVideoRow({
  video,
  index,
  playlistId,
  isActive = false,
}: {
  video: PlaylistVideo
  index: number
  playlistId: string
  isActive?: boolean
}) {
  return (
    <Link
      href={`/watch?id=${video.id}&list=${playlistId}`}
      className={cn(
        "grid grid-cols-[1.5rem_96px_minmax(0,1fr)] gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60",
        isActive && "bg-muted/40"
      )}
    >
      <span className="pt-7 text-center text-xs text-muted-foreground">{index + 1}</span>

      <span className="relative aspect-video overflow-hidden rounded-md bg-muted">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover"
          sizes="96px"
        />
        <Badge className="absolute bottom-1 right-1 text-[10px]">
          {video.duration}
        </Badge>
      </span>

      <span className="min-w-0">
        <span className="line-clamp-2 text-sm font-medium leading-snug">{video.title}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {video.channel}
          {video.meta ? ` • ${video.meta}` : ""}
        </span>
      </span>
    </Link>
  )
}
