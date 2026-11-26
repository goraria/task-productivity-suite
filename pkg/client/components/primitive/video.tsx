import Image from "next/image"
import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
} from "@/components/primitive/custom"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/primitive/default"
import { cn } from "@gorth/primitive/cores/cn"
import type {
  Channel,
  MetadataPosition,
  Video,
  VideoProps,
} from "@/utils/interface"

interface VideoDetailProps {
  channel: Channel
  video: Video
}

interface VideoAvatarProps {
  channel: Channel
}

interface VideoThumbnailProps {
  video: Video
}

export function VideoPlaceHolder({
  video,
  channel,
  layout = "below",
  size = "md",
  metadataPosition,
  className,
  contentClassName,
  ...props
}: VideoProps) {
  const resolvedVideo: Video = {
    id: video?.id,
    thumbnail: video?.thumbnail || "/logo/icon.png",
    title:
      video?.title || "7 Ways to Create Highly Engaging Video Thumbnails",
    duration: video?.duration || "12:48",
    publishedAt: video?.publishedAt || "2 hours ago",
    description: video?.description,
  }
  const resolvedChannel: Channel = {
    ...channel,
    name: channel?.name || "Gorth Studio",
    handle: channel?.handle || "gorth-studio",
  }
  const position: MetadataPosition =
    metadataPosition || (layout === "side" ? "left" : "below")
  const isOverlay = layout === "overlay"
  const isHorizontal = position === "left" || position === "right"

  return (
    <article
      className={cn(
        "group/video flex w-full gap-3 text-left",
        isHorizontal ? "flex-row" : "flex-col",
        position === "left" && "flex-row-reverse",
        position === "top" && "flex-col-reverse",
        isOverlay && "hover:border-professional-main",
        className,
      )}
      {...props}
    >
      <VideoThumbnail video={resolvedVideo} />
      {!isOverlay && (
        <div
          className={cn(
            "min-w-0 flex-1",
            size === "sm" && "text-xs",
            size === "lg" && "text-sm",
            contentClassName,
          )}
        >
          <VideoDetail channel={resolvedChannel} video={resolvedVideo} />
          {resolvedVideo.description && (
            <p className="mt-2 line-clamp-2 text-muted-foreground">
              {resolvedVideo.description}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

export function VideoDetail({ channel, video }: VideoDetailProps) {
  const channelHandle = channel.handle || ""

  return (
    <div className="flex items-start gap-2">
      <VideoAvatar channel={channel} />
      <div className="grid min-w-0 flex-1 text-left leading-tight">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={`/watch?id=${video.id || ""}`}
                className="inline-block min-w-0"
              />
            }
          >
            <h3 className="line-clamp-1 cursor-help font-semibold leading-snug text-foreground transition-colors group-hover/video:text-primary">
              {video.title}
            </h3>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{video.title}</p>
          </TooltipContent>
        </Tooltip>
        <Link
          href={`/channel/${channelHandle}`}
          className="truncate text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {channel.name}
        </Link>
        <span
          className="truncate text-xs text-muted-foreground"
          suppressHydrationWarning
        >
          2M views • {video.publishedAt}
        </span>
      </div>
    </div>
  )
}

export function VideoAvatar({ channel }: VideoAvatarProps) {
  const channelName = channel.name || "Channel"

  return (
    <Link
      href={`/channel/${channel.handle || ""}`}
      className="shrink-0 transition-opacity hover:opacity-80"
      aria-label={channelName}
    >
      <Avatar>
        {channel.avatar ? (
          <AvatarImage src={channel.avatar} alt={channelName} />
        ) : (
          <AvatarFallback>{channelName.slice(0, 2).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>
    </Link>
  )
}

export function VideoThumbnail({ video }: VideoThumbnailProps) {
  return (
    <div className="aspect-video w-full">
      <Link
        href={`/watch?id=${video.id || ""}`}
        className="relative block aspect-video size-full overflow-hidden rounded-lg bg-muted/50 ring-1 ring-black/5 transition-transform duration-300 group-hover/video:-translate-y-0.5 group-hover/video:shadow-xl"
      >
        <Image
          src={video.thumbnail || "/logo/icon.png"}
          alt={video.title || "Video thumbnail"}
          fill
          className="object-cover transition-transform duration-500 group-hover/video:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent opacity-80" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-2 p-2">
          <Badge variant="secondary">4K</Badge>
          <Badge>{video.duration}</Badge>
        </div>
      </Link>
    </div>
  )
}
