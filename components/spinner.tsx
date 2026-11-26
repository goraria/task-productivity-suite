import { cn } from "@gorth-com/primitive/cores/cn"

interface SpinnerProps {
  size?: "default" | "sm" | "md" | "icon"
}

const spinnerSizes = {
  default: "size-4",
  sm: "size-2",
  md: "size-6",
  icon: "size-10",
}

export function Spinner({ size = "default" }: SpinnerProps) {
  return (
    <span
      aria-label="Loading"
      role="status"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-r-transparent text-muted-foreground",
        spinnerSizes[size]
      )}
    />
  )
}
