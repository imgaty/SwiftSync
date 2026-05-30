//
//  manifest.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Builds the web app manifest metadata for Argent, describing install behavior, icons,
//  theme colors, and browser-facing application identity.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Argent",
        short_name: "Argent",
        description: "Financial web app",
        start_url: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
            { src: "/full-icon-black.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: "/icon-white.svg", sizes: "any", type: "image/svg+xml", purpose: "monochrome" },
        ],
    }
}
