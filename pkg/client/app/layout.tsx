import { Geist_Mono, Inter } from "next/font/google"

import "@/styles/globals.css"
import { ApplicationLayout } from "@gorth/primitive/layouts/application"

import { AuthProvider } from "@/providers/auth"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

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
      <AuthProvider>{children}</AuthProvider>
    </ApplicationLayout>
  )
}

