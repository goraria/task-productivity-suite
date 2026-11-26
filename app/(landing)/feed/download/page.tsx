"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  CheckCircle2,
  Download,
  HardDrive,
  MoreVertical,
  Play,
  Settings2,
  Trash2,
  WifiOff,
} from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import { Card, CardContent } from "@gorth-com/primitive/default/card"
import { FeedStatistic } from "@/components/primitive/statistic"
import type { FeedStatisticProps } from "@/utils/interface"
import { Progress } from "@gorth-com/primitive/default/progress"

const downloads = [
  {
    id: "1001",
    title: "How to build a YouTube-style homepage video layout",
    channel: "Gorth Studio",
    thumbnail: "/logo/logo.png",
    duration: "08:42",
    quality: "1080p",
    size: "128 MB",
    downloadedAt: "10 hours ago",
  },
  {
    id: "1002",
    title: "Optimize layout component for video feed UI",
    channel: "Gorth UI",
    thumbnail: "/logo/icon.png",
    duration: "12:48",
    quality: "720p",
    size: "210 MB",
    downloadedAt: "Yesterday",
  },
  {
    id: "1005",
    title: "YouTube-style video layout tutorial in Next.js",
    channel: "Frontend Notes",
    thumbnail: "/logo/logo.png",
    duration: "11:06",
    quality: "1080p",
    size: "185 MB",
    downloadedAt: "3 days ago",
  },
]

export default function DownloadsPage() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setProgress(1), 500)
    return () => clearTimeout(timer)
  }, [])

  const totalSizeMb = downloads.reduce((sum, video) => {
    const value = Number.parseInt(video.size.replace(" MB", ""), 10)
    return sum + (Number.isNaN(value) ? 0 : value)
  }, 0)
  const highQualityCount = downloads.filter(
    (video) => video.quality === "1080p"
  ).length
  const stats: FeedStatisticProps[] = [
    {
      title: "Downloaded videos",
      description: `${downloads.length} items`,
      icon: Download,
      color: "primary-2",
    },
    {
      title: "Storage used",
      description: `${totalSizeMb} MB`,
      icon: HardDrive,
      color: "info",
    },
    {
      title: "1080p quality",
      description: `${highQualityCount} videos`,
      icon: CheckCircle2,
      color: "success",
    },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-row gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-3xl">
          Downloads
        </h1>
        <Button>
          <Settings2 className="size-4" />
          Download settings
        </Button>
      </div>
      {/* <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              <Download className="size-7 text-primary" />
              Downloads
            </h1>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Offline ready
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Videos available for offline playback on this device.
          </p>
        </div>
        <Button variant="outline" className="w-full gap-2 sm:w-max">
          <Settings2 className="size-4" />
          Download settings
        </Button>
      </div> */}

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

      <Card className="flex flex-row items-center rounded-md gap-2.5 p-2.5">
        <div className="flex items-center gap-2.5">
          <Badge className="flex size-11 items-center justify-center rounded-md [&>svg]:size-4">
            <HardDrive className="size-4" />
          </Badge>
          <div className="flex flex-col">
            <span className="font-medium">Download storage</span>
            <span className="text-xs text-muted-foreground">
              {totalSizeMb} MB used of 120 GB
            </span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Progress value={progress} className="max-w-[66%]" />
        </div>
        <span className="text-sm font-medium text-muted-foreground lg:text-right">
          99.0% available
        </span>
      </Card>

      <div className="flex items-center h-14 gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
        <WifiOff className="size-4 shrink-0" />
        <span>
          Offline mode is ready. All listed videos are available without network
          access.
        </span>
      </div>

      <div className="space-y-3">
        {downloads.map((video) => (
          <Card key={video.id} className="border-border/40">
            <CardContent className="grid gap-4 p-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center">
              <Link
                href={`/watch?id=${video.id}`}
                className="relative aspect-video overflow-hidden rounded-lg bg-muted"
              >
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 220px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                  <span className="flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                    <Play className="size-5 fill-current pl-0.5" />
                  </span>
                </div>
                <Badge className="absolute bottom-2 right-2 text-[10px]">
                  {video.duration}
                </Badge>
              </Link>

              <div className="min-w-0 space-y-2">
                <Link
                  href={`/watch?id=${video.id}`}
                  className="hover:text-primary"
                >
                  <h2 className="line-clamp-2 font-semibold leading-snug">
                    {video.title}
                  </h2>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {video.channel} • Downloaded {video.downloadedAt}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{video.quality}</Badge>
                  <Badge variant="outline">{video.size}</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="size-3" />
                    Saved
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-1">
                <Button
                  nativeButton={false}
                  render={<Link href={`/watch?id=${video.id}`} />}
                  variant="outline"
                  size="sm"
                >
                  Play
                </Button>
                <Button variant="ghost" size="icon-sm" title="Delete download">
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm">
                  <MoreVertical className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
