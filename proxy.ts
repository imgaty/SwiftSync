import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionToken } from "@/lib/session"

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/docs",
]

const AUTH_PAGES = ["/login", "/register"]

function isPublic(pathname: string): boolean {
  if (pathname === "/") return false
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth-token")?.value
  const session = token ? await verifySessionToken(token) : null
  const isAuthenticated = !!session

  if (isAuthenticated && AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (isPublic(pathname)) return NextResponse.next()

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname)
    const res = NextResponse.redirect(loginUrl)
    if (token) {
      // Stale or forged token — wipe it so the login page isn't stuck in a redirect loop.
      res.cookies.delete("auth-token")
      res.cookies.delete("user-session")
    }
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|sitemap.xml|.*\\..*|data.json|lang).*)",
  ],
}
