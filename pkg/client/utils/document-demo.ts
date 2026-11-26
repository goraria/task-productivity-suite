export interface DemoDocument {
  id: string
  icon: string
  title: string
  description: string
  category: string
  updatedAt: string
  cover: string
  sections: Array<{
    heading: string
    body: string
  }>
}

export const demoDocuments: DemoDocument[] = [
  {
    id: "product-roadmap",
    icon: "🚀",
    title: "Product roadmap",
    description: "Priorities, milestones, and the plan for our next release.",
    category: "Product",
    updatedAt: "Edited 12 minutes ago",
    cover: "from-indigo-500 via-violet-500 to-fuchsia-400",
    sections: [
      {
        heading: "Vision",
        body: "Build a calm workspace where planning, writing, and collaboration feel like one continuous flow.",
      },
      {
        heading: "This quarter",
        body: "Ship the new editor, improve search relevance, and make the first-run experience useful in under two minutes.",
      },
      {
        heading: "Success looks like",
        body: "Teams spend less time organizing tools and more time turning ideas into finished work.",
      },
    ],
  },
  {
    id: "weekly-planning",
    icon: "🗓️",
    title: "Weekly planning",
    description: "A lightweight ritual for a focused and realistic week.",
    category: "Personal",
    updatedAt: "Edited yesterday",
    cover: "from-amber-300 via-orange-300 to-rose-300",
    sections: [
      {
        heading: "Top outcomes",
        body: "Finish the onboarding prototype, review customer feedback, and protect two mornings for deep work.",
      },
      {
        heading: "Things to remember",
        body: "Keep the plan small, leave room for surprises, and close the week with a short retrospective.",
      },
    ],
  },
  {
    id: "design-notes",
    icon: "🎨",
    title: "Design notes",
    description: "Principles and observations behind the new workspace.",
    category: "Design",
    updatedAt: "Edited 3 days ago",
    cover: "from-emerald-300 via-teal-300 to-cyan-300",
    sections: [
      {
        heading: "Make space for the work",
        body: "The interface should recede when people are writing and reveal controls only when they are useful.",
      },
      {
        heading: "Familiar, not generic",
        body: "Use recognizable patterns, then add personality through rhythm, typography, and thoughtful details.",
      },
    ],
  },
]

export function getDemoDocument(id: string): DemoDocument {
  return demoDocuments.find((document) => document.id === id) ?? demoDocuments[0]
}
