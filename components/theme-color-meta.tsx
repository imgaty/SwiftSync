"use client"

import { useTheme } from "@/components/theme-provider"
import { useEffect } from "react"

// Colors must match globals.css --sidebar
const LIGHT_COLOR = "#fafafa"
const DARK_COLOR = "#09090b"

export function ThemeColorMeta() {
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        if (!resolvedTheme) return
        
        const color = resolvedTheme === "dark" ? DARK_COLOR : LIGHT_COLOR
        
        // Remove ALL existing theme-color meta tags
        document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove())
        
        // Create fresh meta tag
        const meta = document.createElement("meta")
        meta.name = "theme-color"
        meta.content = color
        document.head.insertBefore(meta, document.head.firstChild)
    }, [resolvedTheme])

    return null
}
