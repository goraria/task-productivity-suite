import { NextResponse } from "next/server"

import { serverUrl } from "@/utils/environment"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!serverUrl) {
    return NextResponse.json({ error: "missing_server_url" }, { status: 500 })
  }

  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.json({ error: "invalid_content_type" }, { status: 415 })
  }

  const upstream = await fetch(new URL("/auth/backchannel-logout", serverUrl), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: await request.text(),
    cache: "no-store",
  })

  return new NextResponse(null, {
    status: upstream.ok ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  })
}
