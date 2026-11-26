import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Flame,
  Music,
  Newspaper,
  Play,
  Rocket,
  Sparkles,
  SportShoe,
  TrendingUp,
  Users,
} from "@gorth/primitive/cores/lucide"
import { Badge } from "@gorth/primitive/custom/badge"
import { Button } from "@gorth/primitive/custom/button"
import { Card, CardContent } from "@gorth/primitive/default/card"
import { cn } from "@gorth/primitive/cores/cn"

type ExploreCategoryPageProps = {
  params: Promise<{
    category: string
  }>
}

const categories = {
  music: {
    name: "Music",
    icon: Music,
    description: "Trending tracks, live sessions, and long-play playlists.",
    accent: "bg-amber-500/10 text-amber-600",
    featured: "Coding Session Beats - 24/7 Relaxing Lo-Fi Chill",
  },
  gaming: {
    name: "Gaming",
    icon: Rocket,
    description: "Gameplay, tournaments, reviews, and top clips from the gaming community.",
    accent: "bg-indigo-500/10 text-indigo-600",
    featured: "Next-Gen Engine Open World Gameplay walkthrough",
  },
  news: {
    name: "News",
    icon: Newspaper,
    description: "Tech updates, world news, and the stories everyone is talking about.",
    accent: "bg-emerald-500/10 text-emerald-600",
    featured: "Global Technology Summit 2026 Keynote & AI Releases",
  },
  sport: {
    name: "Sports",
    icon: SportShoe,
    description: "Highlights, match analysis, and the latest training content.",
    accent: "bg-rose-500/10 text-rose-600",
    featured: "Championship Finals Highlights - Epic last minute goals",
  },
}

const videosByCategory = {
  music: [
    { id: "m1", title: "Coding Session Beats - 24/7 Relaxing Lo-Fi Chill", channel: "Lofi Study Beats", duration: "3:45:00", meta: "12K watching", thumbnail: "/logo/icon.png" },
    { id: "m2", title: "Synthesizer Melodies & Ambient Background Waves", channel: "Wave Lab", duration: "42:15", meta: "24K views", thumbnail: "/logo/logo.png" },
    { id: "m3", title: "Acoustic Guitar Sessions - Sweet Instrumental Compilation", channel: "Unplugged", duration: "1:05:00", meta: "88K views", thumbnail: "/logo/icon.png" },
  ],
  gaming: [
    { id: "g1", title: "Next-Gen Engine Open World Gameplay walkthrough", channel: "IGN Gaming", duration: "25:30", meta: "410K views", thumbnail: "/logo/logo.png" },
    { id: "g2", title: "Is this the hardest Indie Platformer ever made?", channel: "IndieSpot", duration: "14:18", meta: "92K views", thumbnail: "/logo/icon.png" },
    { id: "g3", title: "Pro Tournament Finals - Grand Championship Match", channel: "CyberLeague", duration: "48:50", meta: "2.1M views", thumbnail: "/logo/logo.png" },
  ],
  news: [
    { id: "n1", title: "Global Technology Summit 2026 Keynote & AI Releases", channel: "Tech Daily", duration: "1:12:40", meta: "150K views", thumbnail: "/logo/icon.png" },
    { id: "n2", title: "Space Exploration Mission launches successfully to orbit", channel: "Orbit News", duration: "08:15", meta: "620K views", thumbnail: "/logo/logo.png" },
    { id: "n3", title: "Weekly Startup Round-up: The future of web application speed", channel: "Fast Startup", duration: "18:04", meta: "34K views", thumbnail: "/logo/icon.png" },
  ],
  sport: [
    { id: "s1", title: "Championship Finals Highlights - Epic last minute goals", channel: "Sports Central", duration: "10:15", meta: "1.8M views", thumbnail: "/logo/logo.png" },
    { id: "s2", title: "Extreme Mountain Biking Downhill POV - Heart Racing", channel: "Adrenaline", duration: "05:40", meta: "240K views", thumbnail: "/logo/icon.png" },
    { id: "s3", title: "How to perfect your tennis backhand - Expert coaching", channel: "Tennis Pro", duration: "12:12", meta: "75K views", thumbnail: "/logo/logo.png" },
  ],
}

const categoryLinks = Object.entries(categories).map(([slug, category]) => ({
  slug,
  ...category,
}))

export default async function ExploreCategoryPage({ params }: ExploreCategoryPageProps) {
  const { category: categorySlug } = await params
  const category = categories[categorySlug as keyof typeof categories]

  if (!category) {
    notFound()
  }

  const Icon = category.icon
  const videos = videosByCategory[categorySlug as keyof typeof videosByCategory]
  const featuredVideo = videos[0]

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className={cn("flex size-12 items-center justify-center rounded-lg", category.accent)}>
              <Icon className="size-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {category.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {category.description}
              </p>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full gap-2 sm:w-max">
          <Link href="/explore">
            <Sparkles className="size-4" />
            Explore all
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categoryLinks.map((item) => {
          const ItemIcon = item.icon

          return (
            <Button
              key={item.slug}
              asChild
              variant={item.slug === categorySlug ? "default" : "outline"}
              size="sm"
              className="shrink-0"
            >
              <Link href={`/explore/${item.slug}`}>
                <ItemIcon className="size-4" />
                {item.name}
              </Link>
            </Button>
          )
        })}
      </div>

      <Card className="overflow-hidden border-border/40">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <Link href={`/watch?id=${featuredVideo.id}`} className="relative aspect-video overflow-hidden bg-muted">
            <Image
              src={featuredVideo.thumbnail}
              alt={featuredVideo.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
            <Badge className="absolute bottom-3 right-3">{featuredVideo.duration}</Badge>
            <div className="absolute left-4 top-4">
              <Badge className="gap-1">
                <Flame className="size-3.5" />
                Featured
              </Badge>
            </div>
          </Link>
          <div className="flex flex-col justify-center gap-4 p-5">
            <Badge variant="secondary" className="w-max gap-1">
              <TrendingUp className="size-3.5" />
              Trending now
            </Badge>
            <div>
              <h2 className="text-xl font-semibold leading-tight md:text-2xl">
                {category.featured}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {featuredVideo.channel} • {featuredVideo.meta}
              </p>
            </div>
            <Button asChild className="w-max gap-2">
              <Link href={`/watch?id=${featuredVideo.id}`}>
                <Play className="size-4 fill-current" />
                Watch now
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5 text-primary" />
            {category.name} Videos
          </h2>
          <Button variant="ghost" size="sm">
            See more
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} className="group overflow-hidden border-border/40">
              <CardContent className="p-0">
                <Link href={`/watch?id=${video.id}`} className="relative block aspect-video overflow-hidden bg-muted">
                  <Image
                    src={video.thumbnail}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                      <Play className="size-5 fill-current pl-0.5" />
                    </span>
                  </div>
                  <Badge className="absolute bottom-2 right-2 text-[10px]">
                    {video.duration}
                  </Badge>
                </Link>
                <div className="space-y-1 p-4">
                  <Link href={`/watch?id=${video.id}`} className="hover:text-primary">
                    <h3 className="line-clamp-2 font-semibold leading-snug">{video.title}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {video.channel} • {video.meta}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
