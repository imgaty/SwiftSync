//
//  next.config.ts
//  Argent
//
//  Created by hilario on 18 November 2025 at 14:49
//  Last changed by hilario on 30 May 2026 at 19:35
//  Manually Reviewed by hilario on 08 June 2026 at 16:39
//
//  Configures Next.js for Argent, centralizing framework options that affect builds, routing behavior, and runtime integration.
//


import type { NextConfig } from "next"

const securityHeaders = [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" }
]

const nextConfig: NextConfig = {
    devIndicators: false,
    poweredByHeader: false,
    reactStrictMode: true,

    async headers() {
        return [
        {
            source: "/:path*",
            headers: securityHeaders,
        },
        ]
    },
}

export default nextConfig
