"use client"

import { useSearchParams } from "next/navigation"
import {
  Clock,
  ListVideo,
  Lock,
  Play,
  Plus,
  ThumbsUp,
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import { Card, CardContent } from "@gorth/primitive/default/card"
import {
  PlaylistCard,
  PlaylistVideoRow,
  type PlaylistCardData,
} from "@/components/primitive/playlist"
import { FeedStatistic } from "@/components/primitive/statistic"
import { FeedStatisticProps } from "@/utils/interface"

// ─── Mock data ────────────────────────────────────────────────────────────────

const playlists: PlaylistCardData[] = [
  {
    id: "later",
    title: "Watch later",
    description: "Videos you saved to watch when you have time.",
    count: 15,
    visibility: "Private",
    updatedAt: "2 hours ago",
    icon: Clock,
    thumbnails: ["/logo/icon.png", "/logo/logo.png", "/logo/icon.png"],
    videos: [
      {
        id: "1004",
        title: "Build a compact watch page recommendation rail",
        channel: "Gorth Studio",
        duration: "09:24",
        thumbnail: "/logo/icon.png",
        meta: "Added today",
      },
      {
        id: "1005",
        title: "YouTube-style video layout tutorial in Next.js",
        channel: "Frontend Notes",
        duration: "11:06",
        thumbnail: "/logo/logo.png",
        meta: "Added yesterday",
      },
    ],
  },
  {
    id: "like",
    title: "Liked videos",
    description: "Videos you have liked on Gortheia.",
    count: 42,
    visibility: "Private",
    updatedAt: "5 minutes ago",
    icon: ThumbsUp,
    thumbnails: ["/logo/logo.png", "/logo/icon.png", "/logo/logo.png"],
    videos: [
      {
        id: "1001",
        title: "How to build a YouTube-style homepage video layout",
        channel: "Gorth UI",
        duration: "08:42",
        thumbnail: "/logo/logo.png",
        meta: "1.2M views",
      },
      {
        id: "1002",
        title: "Optimize layout component for video feed UI",
        channel: "Gorth Studio",
        duration: "12:48",
        thumbnail: "/logo/icon.png",
        meta: "850K views",
      },
    ],
  },
  {
    id: "music-mix",
    title: "Music Mix",
    description: "Background music, lo-fi vibes, and long live sessions.",
    count: 128,
    visibility: "Unlisted",
    updatedAt: "Yesterday",
    icon: ListVideo,
    thumbnails: ["/logo/icon.png", "/logo/logo.png", "/logo/icon.png"],
    videos: [
      {
        id: "m1",
        title: "Coding Session Beats - 24/7 Relaxing Lo-Fi Chill",
        channel: "Lofi Study Beats",
        duration: "3:45:00",
        thumbnail: "/logo/icon.png",
        meta: "12K watching",
      },
    ],
  },
  {
    id: "creator-tools",
    title: "Creator tools",
    description: "Templates, workflows, and tips for faster content creation.",
    count: 8,
    visibility: "Public",
    updatedAt: "3 days ago",
    icon: ListVideo,
    thumbnails: ["/logo/logo.png", "/logo/icon.png", "/logo/logo.png"],
    videos: [
      {
        id: "1007",
        title: "Design light and dark mode video homepage views",
        channel: "Channel Name",
        duration: "14:02",
        thumbnail: "/logo/logo.png",
        meta: "3.4M views",
      },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlaylistsPage() {
  const searchParams = useSearchParams()
  const selectedValue = searchParams.get("list") ?? "all"

  const visiblePlaylists =
    selectedValue === "all"
      ? playlists
      : playlists.filter((p) => p.id === selectedValue)

  const selectedPlaylist = visiblePlaylists[0] ?? playlists[0]
  const totalVideos = playlists.reduce((sum, p) => sum + p.count, 0)
  const privateCount = playlists.filter((p) => p.visibility === "Private").length

  const stats: FeedStatisticProps[] = [
    {
      title: "Playlists",
      description: playlists.length,
      icon: ListVideo,
      color: "danger",
    },
    {
      title: "Saved videos",
      description: totalVideos,
      icon: Play,
      color: "success",
    },
    {
      title: "Private",
      description: privateCount,
      icon: Lock,
      color: "warning",
    }
  ]

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* ── Header ── */}
      <div className="flex flex-row gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Playlists
        </h1>
        <Button>
          <Plus className="size-4" />
          Create playlist
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <FeedStatistic
            key={stat.title}
            title={stat.title}
            description={stat.description}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">

        {/* Playlist grid — uses PlaylistCard */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePlaylists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} showActions />
          ))}
        </div>

        {/* Sidebar queue — uses PlaylistVideoRow */}
        <aside className="space-y-4">
          <Card className="border-border/40">
            <CardContent className="space-y-4 p-4">
              <div>
                <Badge variant="secondary" className="mb-2">Now viewing</Badge>
                <h2 className="text-lg font-semibold">{selectedPlaylist.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedPlaylist.description}
                </p>
              </div>

              <div className="space-y-1">
                {selectedPlaylist.videos?.map((video, index) => (
                  <PlaylistVideoRow
                    key={video.id}
                    video={video}
                    index={index}
                    playlistId={selectedPlaylist.id}
                    isActive={index === 0}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
