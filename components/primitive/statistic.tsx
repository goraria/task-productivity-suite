import { Card } from "@gorth-com/primitive/default/card"
import { Badge } from "@gorth-com/primitive/custom/badge"
import { cn } from "@gorth-com/primitive/cores/cn"
import { FeedStatisticProps } from "@/utils/interface"

export function FeedStatistic({
  title = "Playlists",
  description = "Total number of playlists created by the user.",
  icon,
  color,
}: FeedStatisticProps) {
  const Icon = icon
  return (
    <Card className="flex flex-row items-center rounded-md gap-2.5 p-2.5">
      <Badge
        className={cn(
          "flex size-10 items-center justify-center rounded-md [&>svg]:size-4"
        )}
        variant={color ? color : "default"}
      >
        <Icon className="size-4" />
      </Badge>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{title}</span>
        <span className="font-medium">{description}</span>
      </div>
    </Card>
  )
}
