"use client"

import { Dashbar } from "@/layouts/dashbar"
import { AuthGuard } from "@/layouts/guard"
import { appGlobal } from "@/utils/constant"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Home,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "@gorth-com/primitive/cores/lucide"
import {
  SidebarInset,
  SidebarProvider,
} from "@gorth-com/primitive/custom/sidebar"
import { AppSidebar } from "@gorth-com/primitive/dashboard/app-sidebar"
import { Copyright } from "@gorth-com/primitive/layouts/copyright"
import React from "react"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/logo/icon.png",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "/feed/history",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Setting",
      url: "#",
      icon: Map,
    },
  ],
}

import { useAuth } from "@/hooks/use-auth"
import { useUser } from "@/hooks/use-user"

export default function SettingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const auth = useAuth()
  const { user } = useUser()
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar
          auth={auth}
          data={{
            ...data,
            teams: [],
            brand: { name: appGlobal.name, logo: "/brand/sidebar.svg" },
            user: user ?? data.user,
            navDropdown: [],
            navSignal: [],
          }}
        />

        <SidebarInset>
          <Dashbar />
          {children}
          <Copyright />
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
