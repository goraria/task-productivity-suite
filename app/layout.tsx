import { ProgressProvider } from "@/hooks/use-progress"
import { Geist_Mono, Inter } from "next/font/google"

import "@/styles/globals.css"
import { ApplicationLayout } from "@gorth-com/primitive/layouts/application"

import { AuthProvider } from "@/providers/auth"
import { appGlobal } from "@/utils/constant"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata = {
  title: { default: appGlobal.name, template: `%s | ${appGlobal.name}` },
  icons: { icon: { url: "/icon.svg", type: "image/svg+xml" } },
}

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ApplicationLayout
      className={`font-sans antialiased ${fontMono.variable} ${inter.variable}`}
    >
      <ProgressProvider pendingLabel="Opening Gorth SSO…">
        <AuthProvider>{children}</AuthProvider>
      </ProgressProvider>
    </ApplicationLayout>
  )
}
