import { NextResponse, type NextRequest } from "next/server"

import { publicPrefixes } from "@/utils/constant"
import { sessionAppCookie } from "@/utils/environment"
import { isPublicRoute } from "@/utils/formatter"

function copySetCookies(source: globalThis.Response, target: NextResponse) {
  const headers = source.headers as Headers & {
    getSetCookie?: () => string[]
  }
  const cookies = headers.getSetCookie?.() ?? []
  if (cookies.length) {
    for (const cookie of cookies) target.headers.append("set-cookie", cookie)
    return target
  }
  const cookie = headers.get("set-cookie")
  if (cookie) target.headers.append("set-cookie", cookie)
  return target
}

async function validateSession(request: NextRequest) {
  return fetch(new URL("/auth/me?fresh=1", request.url), {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
    redirect: "manual",
  })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const acceptsHtml = request.headers.get("accept")?.includes("text/html")
  const isPageRequest =
    request.headers.get("sec-fetch-mode") === "navigate" ||
    Boolean(acceptsHtml) ||
    request.headers.has("rsc")

  // Route Handlers and the same-origin resource gateway perform their own
  // full checks. Limit Proxy validation to page/RSC navigation to avoid one
  // extra UserInfo request for every domain API call.
  if (!isPageRequest) return NextResponse.next()

  const hasAppSession = Boolean(request.cookies.get(sessionAppCookie)?.value)
  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/")
  const isAuthMetadataRoute = pathname.startsWith("/.well-known/")
  const protectedRoute =
    !isPublicRoute(pathname, publicPrefixes) &&
    !isAuthRoute &&
    !isAuthMetadataRoute
  const validateHome = false

  if (!hasAppSession && protectedRoute) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!protectedRoute && !validateHome) return NextResponse.next()

  const validation = await validateSession(request)
  if (validation.ok) {
    const response = NextResponse.next()
    return copySetCookies(validation, response)
  }

  if (validation.status >= 500) {
    return copySetCookies(
      validation,
      new NextResponse("Authentication service unavailable", { status: 503 }),
    )
  }

  return copySetCookies(
    validation,
    protectedRoute
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next(),
  )
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
