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
            { src: "/icon-black.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
            { src: "/full-icon-black.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: "/icon-white.svg", sizes: "any", type: "image/svg+xml", purpose: "monochrome" },
        ],
    }
}
