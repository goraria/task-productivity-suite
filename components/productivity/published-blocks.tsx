import { safeContentUrl } from "@/utils/editor"
export function PublishedBlocks({
  blocks,
}: {
  blocks: { id: string; type: string; content: unknown }[]
}) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const content = (block.content ?? {}) as Record<string, unknown>
        const text = typeof content.text === "string" ? content.text : ""
        const url = safeContentUrl(content.url)
        if (block.type === "divider") return <hr key={block.id} />
        if (block.type === "heading_1")
          return (
            <h2 key={block.id} className="text-3xl font-bold">
              {text}
            </h2>
          )
        if (block.type === "heading_2")
          return (
            <h3 key={block.id} className="text-2xl font-bold">
              {text}
            </h3>
          )
        if (block.type === "heading_3")
          return (
            <h4 key={block.id} className="text-xl font-bold">
              {text}
            </h4>
          )
        if (block.type === "code")
          return (
            <pre
              key={block.id}
              className="overflow-auto rounded-md bg-muted p-4"
            >
              <code>{text}</code>
            </pre>
          )
        if (block.type === "quote")
          return (
            <blockquote key={block.id} className="border-l-2 pl-4 italic">
              {text}
            </blockquote>
          )
        if (block.type === "todo")
          return (
            <p key={block.id}>
              {content.checked === true ? "☑" : "☐"} {text}
            </p>
          )
        if (block.type === "toggle")
          return (
            <details key={block.id}>
              <summary>{text}</summary>
              <p>{String(content.details ?? "")}</p>
            </details>
          )
        if (["bulleted_list", "numbered_list"].includes(block.type))
          return (
            <p key={block.id} className="pl-4">
              {block.type === "bulleted_list" ? "•" : "1."} {text}
            </p>
          )
        if (url)
          return (
            <p key={block.id}>
              <a
                href={url}
                rel="noopener noreferrer"
                target="_blank"
                className="underline"
              >
                {text || url}
              </a>
            </p>
          )
        return (
          <p key={block.id} className="whitespace-pre-wrap">
            {text}
          </p>
        )
      })}
    </div>
  )
}
