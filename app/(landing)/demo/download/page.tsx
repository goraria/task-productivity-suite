"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowDownCircle,
  CheckCircle2,
  Trash2,
  Play,
  HardDrive,
  Settings2,
  MoreVertical,
  WifiOff,
} from "@gorth-com/primitive/cores/lucide"
import { Button } from "@gorth-com/primitive/custom/button"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Card, CardContent } from "@gorth-com/primitive/default/card"

export default function DownloadsPage() {
  const downloadedVideos = [
    {
      video: {
        id: "1001",
        thumbnail: "/logo/logo.png",
        title: "How to build a YouTube-style homepage video layout",
        duration: "08:42",
        size: "128 MB",
        downloadedAt: "10 hours ago",
      },
      channel: {
        name: "Gorth Studio",
        avatar: "/logo/icon.png",
      },
    },
    {
      video: {
        id: "1002",
        thumbnail: "/logo/icon.png",
        title: "Optimize layout component for video feed UI",
        duration: "12:48",
        size: "210 MB",
        downloadedAt: "Yesterday",
      },
      channel: {
        name: "Gorth UI",
        avatar: "/logo/icon.png",
      },
    },
    {
      video: {
        id: "1005",
        thumbnail: "/logo/logo.png",
        title: "YouTube-style video layout tutorial in Next.js",
        duration: "11:06",
        size: "185 MB",
        downloadedAt: "3 days ago",
      },
      channel: {
        name: "Frontend Notes",
        avatar: "/logo/icon.png",
      },
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header section with offline indicator */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Downloads
            </h1>
            <Badge
              variant="secondary"
              className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold gap-1"
            >
              <CheckCircle2 className="size-3" />
              Offline Ready
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Watch downloaded videos offline without an internet connection.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1 text-xs">
            <Settings2 className="size-3.5" />
            Download Settings
          </Button>
        </div>
      </div>

      {/* Disk Storage Status Card */}
      <Card className="border-border/40 bg-card/45 backdrop-blur-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <HardDrive className="size-5" />
            </div>
            <div className="flex-1 md:flex-none">
              <h4 className="font-semibold text-sm">Available Storage</h4>
              <p className="text-xs text-muted-foreground">
                523 MB used of 120 GB
              </p>
            </div>
          </div>
          <div className="flex-1 w-full md:max-w-md">
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: "0.5%" }}
              />
            </div>
          </div>
          <div className="text-right text-xs font-medium shrink-0">
            99.5% Free space
          </div>
        </CardContent>
      </Card>

      {/* Offline Mode Alert banner if no connection (simulated) */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-sm">
        <WifiOff className="size-4 shrink-0" />
        <span>
          You are currently previewing <strong>Offline Playback Mode</strong>.
          Videos below are fully loaded in local cache storage.
        </span>
      </div>

      {/* Download list (grid format) */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {downloadedVideos.map((item) => (
          <Card
            key={item.video.id}
            className="group overflow-hidden border-border/40 bg-card/60 backdrop-blur-xs hover:border-primary/30 transition-all duration-300"
          >
            <CardContent className="p-0">
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <Link
                  href={`/watch?id=${item.video.id}`}
                  className="block w-full h-full relative"
                >
                  <Image
                    src={item.video.thumbnail}
                    alt={item.video.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />

                  {/* Overlay background */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Corner Badges */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="bg-black/80 hover:bg-black/90 text-white border-0 text-[10px]"
                    >
                      {item.video.size}
                    </Badge>
                    <Badge variant="default" className="text-[10px]">
                      {item.video.duration}
                    </Badge>
                  </div>

                  <div className="absolute top-2 left-2">
                    <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white font-medium border-0 gap-1 text-[10px]">
                      <ArrowDownCircle className="size-3" />
                      Downloaded
                    </Badge>
                  </div>

                  {/* Hover play icon */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play className="size-5 fill-current pl-0.5" />
                    </div>
                  </div>
                </Link>
              </div>

              {/* Video metadata and options */}
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-muted overflow-hidden relative shrink-0">
                    <Image
                      src={item.channel.avatar}
                      alt={item.channel.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/watch?id=${item.video.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <h4 className="font-semibold text-sm leading-tight text-foreground line-clamp-2">
                        {item.video.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {item.channel.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Downloaded {item.video.downloadedAt}
                    </p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground shrink-0 self-start">
                    <MoreVertical className="size-4" />
                  </button>
                </div>

                <div className="pt-1 flex gap-2">
                  <Button
                    nativeButton={false}
                    render={<Link href={`/watch?id=${item.video.id}`} />}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold py-1 h-8 bg-muted/30"
                  >
                    Play Offline
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="aspect-square p-0 size-8 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete download"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
