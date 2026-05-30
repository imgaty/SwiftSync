//
//  auth-redirect.ts
//  Argent
//
//  Created by hilario on 27 May 2026 at 17:07.
//  Description: Provides shared auth redirect logic for Argent, centralizing domain behavior, helpers,
//  or integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
const DEFAULT_REDIRECT_PATH = "/"

export function safeRedirectPath(rawPath: string | null | undefined, fallback = DEFAULT_REDIRECT_PATH) {
    const path = String(rawPath || "").trim()

    if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
        return fallback
    }

    try {
        const parsed = new URL(path, "https://argent.local")

        if (parsed.origin !== "https://argent.local") return fallback

        return `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
        return fallback
    }
}

export function isAdminPath(path: string) {
    return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin?") || path.startsWith("/admin#")
}
