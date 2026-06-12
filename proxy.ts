//
//  proxy.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36
//  Last changed by hilario on 30 May 2026 at 19:35
//  Manually Reviewed by hilario on 08 June 2026 at 12:15
//
//  Runs before page requests to add security headers and redirect logged-out users away from private pages
//


import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionToken } from "@/lib/session"


const PUBLIC_PREFIXES = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/docs",
    "/logo-demo",
]
const inProduction = process.env.NODE_ENV === "production"


function isPublic(pathname: string): boolean {                                                  // Checks if the request path is one of the public prefixes
    if (pathname === "/") return false
    return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}


function generateNonce(): string {                                                              // Creates a random nonce for CSP (Content Security Policy) used to allow only scripts with the correct nonce
    const bytes = new Uint8Array(16)                                                            // A nonce is a random binary value, formed from 16 bytes, each ranging from 0 to 255. A new nonce is generated for each request
    crypto.getRandomValues(bytes)
    let binary = ""
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
}


// Defines the Content Security Policy, allow only the stated scripts
function buildContentSecurityPolicy(nonce: string): string {
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'${inProduction ? "" : " 'unsafe-eval'"}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://www.saltedge.com",
        "font-src 'self' data:",
        "connect-src 'self' https://www.saltedge.com https://api.resend.com https://open.er-api.com https://oauth2.googleapis.com https://github.com https://api.github.com https://www.googleapis.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
    ].join("; ")
}


export async function proxy(request: NextRequest) {                                             // CSP request handler. Runs before the page is rendered.
    const { pathname } = request.nextUrl
    const nonce = generateNonce()
    const csp = buildContentSecurityPolicy(nonce)

    const requestHeaders = new Headers(request.headers)                                         // Forward the nonce + CSP on the request so Next.js stamps the nonce onto the framework's own inline bootstrap/hydration scripts during render.
    requestHeaders.set("x-nonce", nonce)
    requestHeaders.set("content-security-policy", csp)

    const forward = () =>
        NextResponse.next({ request: { headers: requestHeaders } })

    const withCsp = (response: NextResponse): NextResponse => {
        response.headers.set("content-security-policy", csp)
        return response
    }

    const token = request.cookies.get("auth-token")?.value
    const session = token ? await verifySessionToken(token) : null
    const isAuthenticated = !!session

    if (isPublic(pathname)) return withCsp(forward())

    if (!isAuthenticated) {
        const loginUrl = new URL("/login", request.url)
        if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname)

        const res = withCsp(NextResponse.redirect(loginUrl))
        if (token) {                                                                            // Stale or forged tokens get wiped so the login page doesn't get stuck in a redirect loop.
            res.cookies.delete("user-session")
            res.cookies.delete("auth-token")
        }
        return res
    }

    return withCsp(forward())
}


export const config = {                                                                         // Defines the paths for the proxy, skipping those stated in the matcher.
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|sitemap.xml|.*\\..*|data.json|lang).*)",
    ],
}
