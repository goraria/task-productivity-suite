import Image from "next/image"
import Link from "next/link"
import {
  Download,
  ListVideo,
  MoreVertical,
  Play,
  Shuffle,
} from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gorth-com/primitive/custom/dropdown"
import { Card, CardContent } from "@gorth-com/primitive/default/card"
import { VideoPlaceHolder } from "@/components/primitive/video"
import { buildPlaylistHref } from "@/utils/temp"

type PlaylistsPageProps = {
  searchParams?: Promise<{
    list?: string
    showUnavailable?: string
    hideWatched?: string
  }>
}

type PlaylistVideoItem = {
  id: string
  thumbnail: string
  title: string
  duration: string
  publishedAt: string
  description: string
  channel: {
    name: string
    handle: string
    avatar: string
  }
  unavailable?: boolean
  watched?: boolean
}

type PlaylistData = {
  id: string
  title: string
  description: string
  totalVideos: number
  thumbnail: string
  updatedAt: string
  videos: PlaylistVideoItem[]
}

const playlists: PlaylistData[] = [
  {
    id: "later",
    title: "Watch later",
    description:
      "A queue of saved videos for focused learning sessions and quick catch-up viewing.",
    totalVideos: 15,
    thumbnail: "/logo/logo.png",
    updatedAt: "Updated 2 hours ago",
    videos: [
      {
        id: "1004",
        thumbnail: "/logo/icon.png",
        title: "Build a compact watch page recommendation rail",
        duration: "09:24",
        publishedAt: "2 hours ago",
        description:
          "A practical guide for a dense recommendation rail with clean hierarchy and strong scanability.",
        channel: {
          name: "Gorth Studio",
          handle: "gorth-studio",
          avatar: "/logo/icon.png",
        },
      },
      {
        id: "1005",
        thumbnail: "/logo/logo.png",
        title: "YouTube-style video layout tutorial in Next.js",
        duration: "11:06",
        publishedAt: "Yesterday",
        description:
          "Build a playlist-first watch flow using reusable cards and route-based state in App Router.",
        channel: {
          name: "Frontend Notes",
          handle: "frontend-notes",
          avatar: "/logo/icon.png",
        },
        watched: true,
      },
      {
        id: "1009",
        thumbnail: "/logo/icon.png",
        title: "Channel page polish checklist",
        duration: "07:49",
        publishedAt: "4 days ago",
        description:
          "Final polish pass for typography scale, spacing rhythm, and utility alignment across channel surfaces.",
        channel: {
          name: "Waddles Studio",
          handle: "waddles-studio",
          avatar: "/logo/logo.png",
        },
        unavailable: true,
      },
    ],
  },
  {
    id: "like",
    title: "Liked videos",
    description:
      "Your liked videos across product, design system, and frontend architecture topics.",
    totalVideos: 42,
    thumbnail: "/logo/icon.png",
    updatedAt: "Updated 5 minutes ago",
    videos: [
      {
        id: "1001",
        thumbnail: "/logo/logo.png",
        title: "How to build a YouTube-style homepage video layout",
        duration: "08:42",
        publishedAt: "15 minutes ago",
        description:
          "End-to-end breakdown of card structure, metadata layering, and responsive behavior.",
        channel: {
          name: "Gorth UI",
          handle: "gorth-base-primitive",
          avatar: "/logo/icon.png",
        },
      },
      {
        id: "1002",
        thumbnail: "/logo/icon.png",
        title: "Optimize layout component for video feed UI",
        duration: "12:48",
        publishedAt: "2 hours ago",
        description:
          "A deep dive into reusable section shells, spacing tokens, and feed-level composition patterns.",
        channel: {
          name: "Gorth Studio",
          handle: "gorth-studio",
          avatar: "/logo/logo.png",
        },
      },
    ],
  },
]

export default async function PlaylistsPage({
  searchParams,
}: PlaylistsPageProps) {
  const params = await searchParams
  const selectedList = params?.list ?? "later"
  const showUnavailable = params?.showUnavailable === "1"
  const hideWatched = params?.hideWatched === "1"

  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedList) ?? playlists[0]

  const filteredVideos = selectedPlaylist.videos.filter((video) => {
    if (!showUnavailable && video.unavailable) {
      return false
    }

    if (hideWatched && video.watched) {
      return false
    }

    return true
  })

  const firstVideo = filteredVideos[0] ?? selectedPlaylist.videos[0]
  const shuffleVideo =
    filteredVideos[1] ?? filteredVideos[0] ?? selectedPlaylist.videos[0]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-5">
        <aside className="xl:col-span-1">
          <Card className="border-border/40">
            <CardContent className="space-y-4 p-4">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <Image
                  src={selectedPlaylist.thumbnail}
                  alt={selectedPlaylist.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 20vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute bottom-2 right-2">
                  <Badge variant="secondary">
                    {selectedPlaylist.totalVideos} videos
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl font-semibold leading-tight">
                  {selectedPlaylist.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {selectedPlaylist.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedPlaylist.updatedAt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2">
                  <Download className="size-4" />
                  Download
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="group/button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="Playlist options"
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      nativeButton={false}
                      render={
                        <Link
                          href={buildPlaylistHref(
                            selectedPlaylist.id,
                            !showUnavailable,
                            hideWatched
                          )}
                        />
                      }
                    >
                      {showUnavailable
                        ? "Hide unavailable"
                        : "Show unavailable"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>Add video</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      nativeButton={false}
                      render={
                        <Link
                          href={buildPlaylistHref(
                            selectedPlaylist.id,
                            showUnavailable,
                            !hideWatched
                          )}
                        />
                      }
                    >
                      {hideWatched
                        ? "Show watched video"
                        : "Remove watched video"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  nativeButton={false}
                  render={
                    <Link
                      href={`/watch?id=${firstVideo.id}&list=${selectedPlaylist.id}`}
                    />
                  }
                >
                  <Play className="size-4 fill-current" />
                  Play all
                </Button>
                <Button
                  nativeButton={false}
                  render={
                    <Link
                      href={`/watch?id=${shuffleVideo.id}&list=${selectedPlaylist.id}`}
                    />
                  }
                  variant="outline"
                >
                  <Shuffle className="size-4" />
                  Shuffle
                </Button>
              </div>

              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Playlists
                </p>
                <div className="space-y-1.5">
                  {playlists.map((playlist) => (
                    <Button
                      key={playlist.id}
                      nativeButton={false}
                      render={
                        <Link
                          href={buildPlaylistHref(
                            playlist.id,
                            showUnavailable,
                            hideWatched
                          )}
                        />
                      }
                      variant={
                        playlist.id === selectedPlaylist.id
                          ? "default"
                          : "ghost"
                      }
                      className="h-8 w-full justify-start"
                    >
                      <ListVideo className="size-4" />
                      <span className="truncate">{playlist.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-3 xl:col-span-4">
          {filteredVideos.map((item, index) => (
            <Card key={item.id} className="border-border/40">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    #{index + 1} in {selectedPlaylist.title}
                  </p>
                  {item.unavailable ? (
                    <Badge variant="warning">Unavailable</Badge>
                  ) : item.watched ? (
                    <Badge variant="secondary">Watched</Badge>
                  ) : null}
                </div>

                <VideoPlaceHolder
                  video={{
                    id: item.id,
                    thumbnail: item.thumbnail,
                    title: item.title,
                    duration: item.duration,
                    publishedAt: item.publishedAt,
                    description: item.description,
                  }}
                  channel={item.channel}
                  layout="below"
                />
              </CardContent>
            </Card>
          ))}

          {filteredVideos.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No videos match the current filter.
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  )
}
