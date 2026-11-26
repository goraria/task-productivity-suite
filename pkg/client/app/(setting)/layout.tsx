"use client";

import React from "react";
import { AuthGuard } from "@/layouts/guard";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@gorth/primitive/custom/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gorth/primitive/default/tooltip";
import { Dashbar } from "@/layouts/dashbar";
import { Copyright } from "@gorth/primitive/layouts/copyright";
import { AppSidebar } from "@gorth/primitive/dashboard/app-sidebar";
import {
  BookOpen,
  Bot,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  GalleryVerticalEnd,
  AudioWaveform,
  Command,
  Home,
} from "@gorth/primitive/cores/lucide";

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
};

export default function SettingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar data={data} />

        <SidebarInset>
          <Dashbar />
          {children}
          <Copyright />
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
