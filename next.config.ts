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
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://graph.microsoft.com https://www.saltedge.com",
      "font-src 'self' data:",
      "connect-src 'self' https://www.saltedge.com https://api.resend.com https://oauth2.googleapis.com https://login.microsoftonline.com https://github.com https://api.github.com https://www.googleapis.com https://graph.microsoft.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
]

const nextConfig: NextConfig = {
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
