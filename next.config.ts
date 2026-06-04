//
//  next.config.ts
//  Argent
//
//  Created by Hilario Ferreira on 18 November 2025 at 14:49.
//  Description: Configures Next.js for Argent, centralizing framework options that affect builds,
//  routing behavior, and runtime integration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next 16 still needs 'unsafe-inline' for some inline styles; tighten later with nonce.
      `script-src 'self'${isProd ? "" : " 'unsafe-eval'"} 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://www.saltedge.com",
      "font-src 'self' data:",
      "connect-src 'self' https://www.saltedge.com https://api.resend.com https://open.er-api.com https://oauth2.googleapis.com https://github.com https://api.github.com https://www.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
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
