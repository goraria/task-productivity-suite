"use client"

import React, { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@gorth-com/primitive/default/card"
import { Badge } from "@gorth-com/primitive/default/badge"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@gorth-com/primitive/custom/avatar"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@gorth-com/primitive/custom/tabs"
import {
  Globe,
  MapPin,
  Calendar,
  Users,
  Video,
  Eye,
  Award,
  Play,
  Heart,
  Share2,
  Bell,
} from "@gorth-com/primitive/cores/lucide"
import Background from "@gorth-com/primitive/assets/background/profile-banner.png"
import Waddles from "@gorth-com/primitive/assets/avatar/waddles.jpeg"
import { cn } from "@gorth-com/primitive/cores/cn"

const channelTabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
  { id: "community", label: "Community" },
  { id: "about", label: "About" },
]

export default function ProfilePage() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [, setActiveTab] = useState("home")

  const channelProfile = {
    name: "Waddles Studio",
    handle: "@waddles",
    subscribers: "248K subscribers",
    videosCount: "186 videos",
    description: [
      "Welcome to the official Waddles Studio YouTube channel, where coding meets premium design aesthetics.",
      "Here you will find full-stack guides, modern UI/UX walk-throughs, custom CSS layouts, and professional next.js templates designed to level up your front-end development skills.",
      "Don't forget to subscribe and turn on notifications for weekly tutorials!",
    ],
    links: [
      { title: "waddles.dev", href: "https://waddles.dev" },
      { title: "GitHub Profile", href: "https://github.com" },
      { title: "Figma Designs", href: "https://figma.com" },
    ],
    url: "youtube.com/@waddles",
    location: "San Francisco, CA",
    joined: "Joined May 10, 2026",
    views: "12,850,000 views",
  }

  const channelVideos = [
    {
      id: "1001",
      title: "How to build a YouTube-style homepage video layout",
      duration: "08:42",
      publishedAt: "15 mins ago",
      views: "1.2M views",
      thumbnail: "/logo/logo.png",
    },
    {
      id: "1002",
      title: "Optimize layout component for video feed UI",
      duration: "12:48",
      publishedAt: "2 hours ago",
      views: "850K views",
      thumbnail: "/logo/icon.png",
    },
    {
      id: "1003",
      title: "Small variant for custom video recommendation list",
      duration: "05:21",
      publishedAt: "Today",
      views: "240K views",
      thumbnail: "/logo/icon.png",
    },
    {
      id: "1005",
      title: "YouTube-style video layout tutorial in Next.js",
      duration: "11:06",
      publishedAt: "3 days ago",
      views: "620K views",
      thumbnail: "/logo/logo.png",
    },
  ]

  const featuredVideo = channelVideos[0]

  return (
    <div className="flex-1 space-y-6">
      {/* Banner / Cover Header */}
      <Card className="overflow-hidden border-border/40 bg-card/45 backdrop-blur-xs py-0">
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-muted">
          <Image
            src={Background}
            alt="Channel banner"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="px-6 pb-6 pt-4">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:text-left">
            <Avatar className="-mt-16 size-32 rounded-xl border-4 border-background bg-background shadow-lg">
              <AvatarImage
                src={Waddles.src}
                alt={channelProfile.name}
                width={128}
                height={128}
                className="size-full rounded-lg object-cover"
              />
              <AvatarFallback className="rounded-lg text-2xl font-bold">
                W
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  {channelProfile.name}
                  <Award className="size-5 text-primary shrink-0" />
                </h2>
                <Badge variant="secondary" className="text-xs font-medium">
                  Verified Partner
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-sm text-muted-foreground mt-2">
                <span className="font-semibold text-foreground">
                  {channelProfile.handle}
                </span>
                <span>•</span>
                <span>{channelProfile.subscribers}</span>
                <span>•</span>
                <span>{channelProfile.videosCount}</span>
              </div>

              <p className="text-xs text-muted-foreground mt-2 line-clamp-1 max-w-2xl mx-auto md:mx-0">
                {channelProfile.description[0]}
              </p>
            </div>

            {/* Channel actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
              <Button
                onClick={() => setIsSubscribed(!isSubscribed)}
                className={cn(
                  "font-bold px-6",
                  isSubscribed
                    ? "bg-muted text-muted-foreground hover:bg-muted/80 gap-1.5"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isSubscribed ? (
                  <>
                    <Bell className="size-4 animate-bounce" />
                    Subscribed
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9"
                title="Share Channel"
              >
                <Share2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Layout */}
      <Tabs defaultValue="home" className="w-full">
        <div className="border-b border-border/40 overflow-x-auto">
          <TabsList className="w-max justify-start gap-6 rounded-none p-0 bg-transparent h-12">
            {channelTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="h-full rounded-none border-b-2 border-transparent bg-transparent px-2 text-sm font-semibold text-muted-foreground shadow-none hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Home Tab */}
        <TabsContent value="home" className="space-y-6 pt-6">
          {/* Featured Video Spotlight */}
          <div className="grid gap-6 md:grid-cols-12 border-b border-border/40 pb-6">
            <div className="md:col-span-5 aspect-video w-full rounded-xl overflow-hidden relative bg-muted group">
              <Image
                src={featuredVideo.thumbnail}
                alt={featuredVideo.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Play className="size-6 fill-current pl-0.5" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <Badge variant="default" className="text-[10px] font-bold">
                  {featuredVideo.duration}
                </Badge>
              </div>
            </div>

            <div className="md:col-span-7 flex flex-col justify-center space-y-3">
              <Badge
                variant="secondary"
                className="w-max bg-primary/10 text-primary border-primary/20"
              >
                Featured Release
              </Badge>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {featuredVideo.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {featuredVideo.views} • {featuredVideo.publishedAt}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {channelProfile.description[1]}
              </p>
              <Button
                nativeButton={false}
                render={<Link href={`/watch?id=${featuredVideo.id}`} />}
                size="sm"
                className="w-max font-semibold gap-1.5"
              >
                <Play className="size-4 fill-current" />
                Watch Video
              </Button>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="space-y-4">
            <h4 className="font-bold text-lg">Recent Uploads</h4>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {channelVideos.map((video) => (
                <Card
                  key={video.id}
                  className="group overflow-hidden border-border/40 bg-card/60 backdrop-blur-xs hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                      <Link
                        href={`/watch?id=${video.id}`}
                        className="block w-full h-full relative"
                      >
                        <Image
                          src={video.thumbnail}
                          alt={video.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="default" className="text-[10px]">
                            {video.duration}
                          </Badge>
                        </div>
                      </Link>
                    </div>
                    <div className="p-3">
                      <Link
                        href={`/watch?id=${video.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <h5 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                          {video.title}
                        </h5>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        {video.views} • {video.publishedAt}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {channelVideos.map((video) => (
              <Card
                key={video.id}
                className="group overflow-hidden border-border/40 bg-card/60 backdrop-blur-xs hover:border-primary/30 transition-all duration-300"
              >
                <CardContent className="p-0">
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    <Link
                      href={`/watch?id=${video.id}`}
                      className="block w-full h-full relative"
                    >
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute bottom-2 right-2">
                        <Badge variant="default" className="text-[10px]">
                          {video.duration}
                        </Badge>
                      </div>
                    </Link>
                  </div>
                  <div className="p-3">
                    <Link
                      href={`/watch?id=${video.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <h5 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                        {video.title}
                      </h5>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.views} • {video.publishedAt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Shorts Tab */}
        <TabsContent value="shorts" className="pt-6">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            {[1, 2, 3, 4].map((i) => (
              <Card
                key={i}
                className="group overflow-hidden border-border/40 bg-card/60 relative aspect-[9/16] hover:border-primary/30 transition-all"
              >
                <Image
                  src="/logo/icon.png"
                  alt="Short video thumbnail"
                  fill
                  className="object-cover opacity-75 group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                  <h5 className="font-bold text-xs line-clamp-2">
                    Creative coding techniques for designers #shorts
                  </h5>
                  <p className="text-[10px] text-white/80 mt-1">120K views</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists" className="pt-6">
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <Card className="overflow-hidden border-border/40 bg-card/60 group">
              <div className="aspect-video w-full relative bg-muted">
                <Image
                  src="/logo/logo.png"
                  alt="Playlist cover"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-black/80 flex flex-col items-center justify-center text-white">
                  <Video className="size-5 mb-1" />
                  <span className="text-xs font-bold">12</span>
                </div>
              </div>
              <div className="p-3">
                <h5 className="font-bold text-sm text-foreground">
                  Next.js 16 Tutorials
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated 2 days ago
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community" className="pt-6 space-y-4">
          <Card className="border-border/40 bg-card/45 backdrop-blur-xs p-6">
            <div className="flex gap-3">
              <Avatar className="size-10">
                <AvatarImage src={Waddles.src} />
                <AvatarFallback>W</AvatarFallback>
              </Avatar>
              <div>
                <h5 className="font-bold text-sm text-foreground">
                  {channelProfile.name}
                </h5>
                <p className="text-[10px] text-muted-foreground">3 days ago</p>
                <p className="text-sm text-foreground mt-3">
                  Hey team! We are dropping a massive guide on optimize layout
                  performance in Next.js Turbopack this Friday. Leave a like if
                  you are excited! 🚀
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <button className="flex items-center gap-1 hover:text-primary">
                    <Heart className="size-3.5" /> 248
                  </button>
                  <button className="hover:text-primary">Share</button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="pt-6">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-8 space-y-6">
              <div className="space-y-3">
                <h4 className="font-bold text-lg border-b border-border/40 pb-2">
                  Description
                </h4>
                {channelProfile.description.map((desc, i) => (
                  <p
                    key={i}
                    className="text-sm text-muted-foreground leading-relaxed"
                  >
                    {desc}
                  </p>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-lg border-b border-border/40 pb-2">
                  Links
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {channelProfile.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1.5"
                    >
                      <Globe className="size-4" />
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-4 bg-muted/30 border border-border/40 rounded-xl p-6 h-max space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Channel Stats
              </h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center gap-2 text-foreground">
                  <Globe className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Link:
                  </span>
                  <span className="truncate">{channelProfile.url}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Location:
                  </span>
                  <span>{channelProfile.location}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Joined:
                  </span>
                  <span>{channelProfile.joined}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Subscribers:
                  </span>
                  <span>{channelProfile.subscribers}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <Video className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Videos:
                  </span>
                  <span>{channelProfile.videosCount}</span>
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <Eye className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Total Views:
                  </span>
                  <span>{channelProfile.views}</span>
                </li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
