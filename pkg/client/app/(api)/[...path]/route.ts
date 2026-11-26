import type { NextRequest } from "next/server"

import { accessTokenCookie, serverUrl } from "@/utils/environment"
import { forwardRouteRequest } from "@/services/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ProxyContext {
  params: Promise<{ path: string[] }>
}

const requestBodyMethods = new Set(["POST", "PUT", "PATCH", "DELETE"])
const forwardedRequestHeaders = [
  "accept",
  "content-type",
  "if-match",
  "if-none-match",
  "if-modified-since",
  "range",
  "idempotency-key",
  "x-request-id",
] as const

async function proxyResourceRequest(
  request: NextRequest,
  context: ProxyContext
) {
  const accessToken = request.cookies.get(accessTokenCookie)?.value

  if (!accessToken) {
    return Response.json({ error: "missing_access_token" }, { status: 401 })
  }

  if (!serverUrl) {
    return Response.json({ error: "missing_app_server_url" }, { status: 500 })
  }

  const { path } = await context.params
  const endpoint = new URL(
    `/${path.map(encodeURIComponent).join("/")}`,
    serverUrl
  )
  endpoint.search = request.nextUrl.search

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` })
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  return forwardRouteRequest({
    url: endpoint,
    method: request.method,
    headers,
    body: requestBodyMethods.has(request.method)
      ? await request.arrayBuffer()
      : undefined,
  })
}

export function GET(request: NextRequest, context: ProxyContext) {
  return proxyResourceRequest(request, context)
}

export function HEAD(request: NextRequest, context: ProxyContext) {
  return proxyResourceRequest(request, context)
}

export function POST(request: NextRequest, context: ProxyContext) {
  return proxyResourceRequest(request, context)
}

export function PUT(request: NextRequest, context: ProxyContext) {
  return proxyResourceRequest(request, context)
}

export function PATCH(request: NextRequest, context: ProxyContext) {
  return proxyResourceRequest(request, context)
}

export function DELETE(request: NextRequest, context: ProxyContext) {
  return proxyResourceRequest(request, context)
}
