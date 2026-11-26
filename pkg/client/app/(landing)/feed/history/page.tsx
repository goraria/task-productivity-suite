import Image from "next/image"
import Link from "next/link"
import {
  CalendarDays,
  Clock3,
  History,
  MoreVertical,
  PauseCircle,
  Search,
  Trash2,
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import { Input } from "@gorth/primitive/default/input"
import { Card, CardContent } from "@gorth/primitive/default/card"
import { FeedStatistic } from "@/components/primitive/statistic"
import type { FeedStatisticProps } from "@/utils/interface"

const historyGroups = [
  {
    label: "Today",
    videos: [
      {
        id: "3001",
        title: "Overlay layout for featured video content",
        channel: "Gorth Studio",
        watchedAt: "20 minutes ago",
        progress: "80%",
        duration: "14:02",
        thumbnail: "/logo/logo.png",
        description: "A featured video layout with metadata overlaid on the thumbnail.",
      },
      {
        id: "3002",
        title: "Build responsive channel header with actions",
        channel: "Waddles Studio",
        watchedAt: "2 hours ago",
        progress: "35%",
        duration: "08:42",
        thumbnail: "/logo/icon.png",
        description: "How to align avatar, description, and action buttons in a single row.",
      },
    ],
  },
  {
    label: "Yesterday",
    videos: [
      {
        id: "3003",
        title: "Video feed performance patterns in Next.js",
        channel: "Frontend Notes",
        watchedAt: "Yesterday",
        progress: "100%",
        duration: "12:48",
        thumbnail: "/logo/logo.png",
        description: "Optimizing video lists, images, and metadata when rendering long feeds.",
      },
      {
        id: "3004",
        title: "Design compact cards for saved playlists",
        channel: "Gorth UI",
        watchedAt: "Yesterday",
        progress: "55%",
        duration: "09:16",
        thumbnail: "/logo/icon.png",
        description: "Scannable playlist card pattern for a personal library page.",
      },
    ],
  },
]

export default function HistoryPage() {
  const watchedThisWeek = historyGroups.reduce(
    (sum, group) => sum + group.videos.length,
    0
  )
  const inProgress = historyGroups.reduce(
    (sum, group) =>
      sum + group.videos.filter((video) => Number.parseInt(video.progress, 10) < 100).length,
    0
  )
  const stats: FeedStatisticProps[] = [
    {
      title: "Watched this week",
      description: `${watchedThisWeek} videos`,
      icon: Clock3,
      color: "primary-2",
    },
    {
      title: "In progress",
      description: `${inProgress} videos`,
      icon: PauseCircle,
      color: "success",
    },
    {
      title: "Last active",
      description: "20 mins ago",
      icon: CalendarDays,
      color: "warning",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            <History className="size-7 text-primary" />
            Watch history
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Resume content you were watching and rediscover recent videos.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <div className="relative flex-1 xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search watch history" />
          </div>
          <Button variant="outline" className="gap-2">
            <Trash2 className="size-4" />
            Clear history
          </Button>
        </div>
      </div>

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

      <div className="space-y-8">
        {historyGroups.map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-base font-semibold">{group.label}</h2>
            <div className="space-y-3">
              {group.videos.map((video) => (
                <Card key={video.id} className="border-border/40">
                  <CardContent className="grid gap-4 p-3 md:grid-cols-[240px_minmax(0,1fr)_auto] md:items-start">
                    <Link
                      href={`/watch?id=${video.id}`}
                      className="relative aspect-video overflow-hidden rounded-lg bg-muted"
                    >
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 240px"
                      />
                      <Badge className="absolute bottom-2 right-2 text-[10px]">
                        {video.duration}
                      </Badge>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                        <div className="h-full bg-primary" style={{ width: video.progress }} />
                      </div>
                    </Link>

                    <div className="min-w-0 space-y-2">
                      <Link href={`/watch?id=${video.id}`} className="hover:text-primary">
                        <h3 className="line-clamp-2 font-semibold leading-snug">
                          {video.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {video.channel} • {video.watchedAt}
                      </p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {video.description}
                      </p>
                    </div>

                    <Button variant="ghost" size="icon-sm" className="justify-self-end">
                      <MoreVertical className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
