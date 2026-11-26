"use client"

import { VideoPlaceHolder } from "@/components/primitive/video"

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4 border-border/40">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
          Watch History
        </h1>
        <p className="text-muted-foreground text-sm">
          Keep track of what you have watched recently.
        </p>
      </div>

      <div className="max-w-3xl">
        <VideoPlaceHolder
          layout="side"
          size="md"
          metadataPosition="right"
          video={{
            id: "3003",
            thumbnail: "/logo/logo.png",
            title: "Overlay layout for featured video content",
            publishedAt: "Yesterday",
            duration: "14:02",
            description: "Still a standard video card but the metadata is overlayed on top of the image, suitable for hero banners.",
          }}
          channel={{
            name: "Channel Name",
            handle: "channel-name",
            avatar: "/logo/icon.png",
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50 border border-dashed border-border/30 flex items-center justify-center text-xs text-muted-foreground">Empty history slot</div>
          <div className="aspect-video rounded-xl bg-muted/50 border border-dashed border-border/30 flex items-center justify-center text-xs text-muted-foreground">Empty history slot</div>
          <div className="aspect-video rounded-xl bg-muted/50 border border-dashed border-border/30 flex items-center justify-center text-xs text-muted-foreground">Empty history slot</div>
        </div>
      </div>
    </div>
  )
}
