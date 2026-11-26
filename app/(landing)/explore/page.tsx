import Link from "next/link"
import {
  ArrowRight,
  Music,
  Newspaper,
  Rocket,
  SportShoe,
} from "@gorth-com/primitive/cores/lucide"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { Button } from "@gorth-com/primitive/custom/button"
import { Card, CardContent } from "@gorth-com/primitive/default/card"

const categories = [
  {
    slug: "music",
    name: "Music",
    description: "Trending tracks, live sessions, and long-play playlists.",
    icon: Music,
    featured: "Coding Session Beats - 24/7 Relaxing Lo-Fi Chill",
  },
  {
    slug: "gaming",
    name: "Gaming",
    description: "Gameplay, tournaments, reviews, and creator highlights.",
    icon: Rocket,
    featured: "Next-Gen Engine Open World Gameplay walkthrough",
  },
  {
    slug: "news",
    name: "News",
    description: "Tech updates, global events, and editorial explainers.",
    icon: Newspaper,
    featured: "Global Technology Summit 2026 Keynote & AI Releases",
  },
  {
    slug: "sport",
    name: "Sports",
    description: "Highlights, match analysis, and training content.",
    icon: SportShoe,
    featured: "Championship Finals Highlights - Epic last minute goals",
  },
]

export default function ExplorePage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Explore
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse category pages and jump into focused video feeds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const Icon = category.icon

          return (
            <Card key={category.slug} className="border-border/40">
              <CardContent className="flex h-full flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Icon className="size-3.5" />
                    Category
                  </Badge>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                  <p className="line-clamp-2">{category.featured}</p>
                </div>

                <Button
                  nativeButton={false}
                  render={<Link href={`/explore/${category.slug}`} />}
                  variant="outline"
                  className="mt-auto w-full justify-between"
                >
                  Open {category.name}
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
