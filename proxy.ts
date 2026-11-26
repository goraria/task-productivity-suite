import { oauthCookiePrefix } from "@/utils/environment"
import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { publicPrefixes } from "@/utils/constant"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === "/health" || /^\/task\/(event|resource-policy)\/dispatch$/.test(pathname))
    return NextResponse.next()
  if (/^\/(internal|external)(\/|$)/.test(pathname))
    return NextResponse.next()
  const navigation =
    request.headers.get("sec-fetch-mode") === "navigate" ||
    request.headers.get("accept")?.includes("text/html") ||
    request.headers.has("rsc")
  if (!navigation) return NextResponse.next()
  const publicRoute =
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/.well-known/") ||
    publicPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )
  if (
    !publicRoute &&
    !getSessionCookie(request, { cookiePrefix: oauthCookiePrefix })
  )
    return NextResponse.redirect(new URL("/", request.url))
  // Optimistic cookie gate only; native sessions + local policy authorize APIs.
  return NextResponse.next()
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
