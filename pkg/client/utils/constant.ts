import {
  GalleryVerticalEnd,
  AudioWaveform,
  Command,
  BarChart3,
  MessageSquare,
  Users,
  SquareUser,
  Home,
  LifeBuoy,
  Send,
  History,
  ListVideo,
  Clock,
  ThumbsUp,
  Download,
  Music,
  Rocket,
  Newspaper,
  SportShoe,
  BadgeCheck,
  Bolt,
  LogIn,
  KeySquare,
} from "@gorth/primitive/cores/lucide"

export const publicPrefixes = ["/demo", "/lab"] as const

export const mainSidebar = {
  // user: {
  //   name: "japtor",
  //   email: "japtor@gorth.org",
  //   avatar: "/avatar/waddles.jpeg",
  // },
  route: "/",
  role: "main",
  brand: {
    name: "Gortheia",
    logo: "/logo/icon.png",
  },
  // teams: [
  //   {
  //     name: "Gorth Inc.",
  //     logo: GalleryVerticalEnd,
  //     plan: "Enterprise",
  //   },
  //   {
  //     name: "Goraria Corp.",
  //     logo: AudioWaveform,
  //     plan: "Startup",
  //   },
  //   {
  //     name: "Waddles Corp.",
  //     logo: Command,
  //     plan: "Free",
  //   },
  // ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Your channel",
      url: "/channel",
      icon: SquareUser,
      isActive: true,
    },
    {
      title: "History",
      url: "#",
      icon: History,
      isActive: true,
      items: [
        {
          title: "General",
          url: "/feed/history",
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
    {
      title: "Playlists",
      url: "/feed/playlist",
      icon: ListVideo,
      isActive: true,
    },
    {
      title: "Watch later",
      url: "/playlist?list=later",
      icon: Clock,
      isActive: true,
    },
    {
      title: "Liked videos",
      url: "/playlist?list=like",
      icon: ThumbsUp,
      isActive: true,
    },
    {
      title: "Downloads",
      url: "/feed/download",
      icon: Download,
      isActive: true,
    },
  ],
  navSecondary: [
    {
      title: "Your videos",
      url: "/profile/video",
      icon: SquareUser,
      isActive: true,
    },
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
      name: "Music",
      url: "/explore/music",
      icon: Music,
    },
    {
      name: "Gaming",
      url: "/explore/gaming",
      icon: Rocket,
    },
    {
      name: "News",
      url: "/explore/news",
      icon: Newspaper,
    },
    {
      name: "Sports",
      url: "/explore/sport",
      icon: SportShoe,
    },
  ],
  navDropdown: [
    {
      title: "Account",
      url: "/account",
      icon: BadgeCheck,
    },
    {
      title: "Settings",
      url: "/setting",
      icon: Bolt,
    },
  ],
  navSignal: [
    {
      title: "Sign In",
      url: "/sign-in",
      icon: LogIn,
    },
    {
      title: "Sign Up",
      url: "/sign-up",
      icon: KeySquare,
    },
  ],
}
