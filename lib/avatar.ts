//
//  avatar.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared avatar logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
const SVG_SIZE = 256
const BACKGROUND_COLOR = "#111113"
const TEXT_COLOR = "#F5F5F5"

function pickInitial(value: string): string {
  const cleaned = value.trim()
  if (!cleaned) return ""
  return Array.from(cleaned)[0]?.toUpperCase() ?? ""
}

export function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) return "U"

  const first = pickInitial(parts[0])
  const last = parts.length > 1 ? pickInitial(parts[parts.length - 1]) : ""

  if (first && last) return `${first}${last}`

  const fallback = Array.from(parts[0]).slice(0, 2).join("").toUpperCase()
  return fallback || "U"
}

export function generateDefaultAvatarDataUrl(name: string): string {
  const initials = initialsFromName(name)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" role="img" aria-label="${initials}"><rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${TEXT_COLOR}" font-size="104" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing="2">${initials}</text></svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
