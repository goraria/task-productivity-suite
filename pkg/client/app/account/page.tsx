import { redirect } from "next/navigation"

import { authUrl } from "@/lib/environment"

export default function AccountPage() {
  redirect(new URL("/setting", authUrl!).toString())
}
