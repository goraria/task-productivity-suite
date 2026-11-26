"use client"

import React from "react"
import Link from "next/link"
import { Card } from "@gorth-com/primitive/default/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gorth-com/primitive/default/accordion"
import { VideoPlaceHolder, VideoAvatar } from "@/components/primitive/video"
import {
  VideoPlayer,
  VideoPlayerCaptionsButton,
  VideoPlayerControlBar,
  VideoPlayerFullscreenButton,
  VideoPlayerLiveButton,
  VideoPlayerMuteButton,
  VideoPlayerPipButton,
  VideoPlayerPlayButton,
  VideoPlayerPlaybackRateButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from "@gorth-com/primitive/pattern/video-player"
import { ButtonGroup } from "@gorth-com/primitive/default/button-group"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  ThumbsUp,
  ThumbsDown,
  Share,
  Bookmark,
  Download,
  Flag,
} from "@gorth-com/primitive/cores/lucide"
import type { SuggestionItem } from "@/utils/interface"

export default function Watch() {
  const suggestions: SuggestionItem[] = [
    {
      video: {
        id: "s-1001",
        thumbnail: "/logo/icon.png",
        title: "Building custom interactive components",
        publishedAt: "2 hours ago",
        duration: "08:12",
      },
      channel: {
        name: "Gorth Studio",
        slug: "gorth-studio",
        avatar: "/logo/icon.png",
      },
    },
    {
      video: {
        id: "s-1002",
        thumbnail: "/logo/logo.png",
        title: "Modern responsive web designs under 15 minutes",
        publishedAt: "Today",
        duration: "05:44",
      },
      channel: {
        name: "UI Lab",
        slug: "ui-lab",
        avatar: "/logo/icon.png",
      },
    },
    {
      video: {
        id: "s-1003",
        thumbnail: "/logo/icon.png",
        title: "Styling layout elements like a professional coder",
        publishedAt: "1 day ago",
        duration: "11:06",
      },
      channel: {
        name: "Frontend Notes",
        slug: "frontend-notes",
        avatar: "/logo/icon.png",
      },
    },
    {
      video: {
        id: "s-1004",
        thumbnail: "/logo/logo.png",
        title: "How to use local storage APIs effectively",
        publishedAt: "3 days ago",
        duration: "09:30",
      },
      channel: {
        name: "Creator One",
        slug: "creator-one",
        avatar: "/logo/icon.png",
      },
    },
  ]

  return (
    <div className="">
      <div className="grid gap-6 3xl:grid-cols-6 2xl:grid-cols-5 xl:grid-cols-4 lg:grid-cols-single">
        <div className="flex flex-col gap-4 3xl:col-span-5 2xl:col-span-4 lg:col-span-3">
          <div className="flex">
            <VideoPlayer className="w-full rounded-lg overflow-hidden border">
              <video
                className="flex items-center justify-center object-cover"
                slot="media"
                src="https://m3md.n6uem8.xyz/doudou/ms/a52c74711847369ea09049cfa6__1125583/hls/1/index.m3u8"
                poster="https://4kwallpapers.com/images/walls/thumbs_3t/26268.jpg"
                suppressHydrationWarning
              />
              <VideoPlayerControlBar className="p-2 gap-2 opacity-75">
                <VideoPlayerPlayButton className="size-9 rounded-md" />
                <VideoPlayerMuteButton className="size-9 rounded-md" />
                <VideoPlayerVolumeRange className="h-9 rounded-md" />
                <VideoPlayerPlaybackRateButton className="h-9 rounded-md" />
                <VideoPlayerLiveButton className="h-9 rounded-md" />
                <VideoPlayerTimeDisplay
                  className="h-9 rounded-md"
                  showDuration
                />
                <VideoPlayerTimeRange className="h-9 rounded-md" />
                <VideoPlayerCaptionsButton className="size-9 rounded-md" />
                <VideoPlayerPipButton className="size-9 rounded-md" />
                <VideoPlayerFullscreenButton className="size-9 rounded-md" />
              </VideoPlayerControlBar>
            </VideoPlayer>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold">
              Overlay layout for featured content
            </h1>
            <div className="flex flex-row justify-between">
              <div className="flex items-start gap-2">
                <VideoAvatar
                  channel={{
                    avatar: "/logo/icon.png",
                    name: "Japtor",
                    handle: "japtor",
                  }}
                />
                <div className="flex flex-col text-left leading-tight">
                  <Link
                    href={`/channel/${"japtor"}`}
                    className="truncate text-foreground font-medium text-sm hover:text-foreground"
                  >
                    {"Japtor"}
                  </Link>
                  <span
                    className="truncate text-muted-foreground text-xs"
                    suppressHydrationWarning
                  >
                    2M subs
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ButtonGroup>
                  <Button variant="outline">
                    <ThumbsUp className="size-4" />
                    1M
                  </Button>
                  <Button variant="outline">
                    <ThumbsDown className="size-4" />
                    100
                  </Button>
                </ButtonGroup>
                <Button variant="outline">
                  Share
                  <Share className="size-4" />
                </Button>
                <Button variant="outline">
                  Save
                  <Bookmark className="size-4" />
                </Button>
                <Button variant="outline">
                  Download
                  <Download className="size-4" />
                </Button>
                <Button variant="outline">
                  Report
                  <Flag className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <Card className="p-4 gap-2">
            <div className="text-sm text-muted-foreground">
              2M views • Yesterday
            </div>
            <Accordion className="w-full">
              <AccordionItem value="description">
                <AccordionTrigger className="p-0">Description</AccordionTrigger>
                <AccordionContent className="p-0 pt-2 h-auto text-sm text-muted-foreground space-y-2">
                  <p>
                    We offer standard (5-7 days), express (2-3 days), and
                    overnight shipping. Free shipping on international orders.
                  </p>
                  <p>
                    This is a custom premium video card designed for modern
                    dashboard environments. The metadata sits on top of the
                    banner to create a movie theater style experience, which
                    fits perfectly for featured hero items.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-1">
          <div className="flex flex-col gap-3">
            {suggestions.map((item) => (
              <VideoPlaceHolder
                key={item.video.id}
                layout="side"
                size="md"
                metadataPosition="below"
                video={item.video}
                channel={item.channel}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
