export function Search() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-popover px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent">
      <input
        type="text"
        placeholder="Search videos, channels, playlists..."
        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}