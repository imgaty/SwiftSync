"use client"

import * as React from "react"

type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia"

interface ColorBlindContextValue {
    mode: ColorBlindMode
    setMode: (mode: ColorBlindMode) => void
}

const ColorBlindContext = React.createContext<ColorBlindContextValue | undefined>(undefined)

const COLOR_BLIND_COOKIE = "colorblind_mode"

// CSS variable names in order - the arrays below follow this order
const COLOR_VARS = [
    "--color-income",
    "--color-expenses", 
    "--color-salary",
    "--color-freelance",
    "--color-investment",
    "--color-food",
    "--color-transport",
    "--color-housing",
    "--color-utilities",
    "--color-subscriptions",
    "--color-entertainment",
    "--color-shopping",
    "--color-health",
    "--color-insurance",
    "--color-services",
    "--color-other",
    "--success",
    "--destructive",
] as const

// Color palettes for each mode - values match the order of COLOR_VARS above
// Format: [light mode colors, dark mode colors]
const COLOR_PALETTES: Record<ColorBlindMode, { light: string[]; dark: string[] }> = {
    none: {
        light: [
            "rgba(34, 197, 94, 1)",   // income - green
            "rgba(239, 68, 68, 1)",   // expenses - red
            "rgba(59, 130, 246, 1)",  // salary - blue
            "rgba(139, 92, 246, 1)",  // freelance - violet
            "rgba(245, 158, 11, 1)",  // investment - amber
            "rgba(239, 68, 68, 1)",   // food - red
            "rgba(59, 130, 246, 1)",  // transport - blue
            "rgba(139, 92, 246, 1)",  // housing - violet
            "rgba(6, 182, 212, 1)",   // utilities - cyan
            "rgba(245, 158, 11, 1)",  // subscriptions - amber
            "rgba(236, 72, 153, 1)",  // entertainment - pink
            "rgba(16, 185, 129, 1)",  // shopping - emerald
            "rgba(20, 184, 166, 1)",  // health - teal
            "rgba(99, 102, 241, 1)",  // insurance - indigo
            "rgba(132, 204, 22, 1)",  // services - lime
            "rgba(107, 114, 128, 1)", // other - gray
            "rgba(34, 197, 94, 1)",   // success - green
            "rgba(239, 68, 68, 1)",   // destructive - red
        ],
        dark: [
            "rgba(34, 197, 94, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(139, 92, 246, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(239, 68, 68, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(139, 92, 246, 1)",
            "rgba(6, 182, 212, 1)",
            "rgba(245, 158, 11, 1)",
            "rgba(236, 72, 153, 1)",
            "rgba(16, 185, 129, 1)",
            "rgba(20, 184, 166, 1)",
            "rgba(99, 102, 241, 1)",
            "rgba(132, 204, 22, 1)",
            "rgba(107, 114, 128, 1)",
            "rgba(34, 197, 94, 1)",
            "rgba(239, 68, 68, 1)",
        ],
    },
    // Deuteranopia (red-green, most common) - uses blue/orange
    deuteranopia: {
        light: [
            "rgba(59, 130, 246, 1)",   // income - blue
            "rgba(249, 115, 22, 1)",   // expenses - orange
            "rgba(99, 102, 241, 1)",   // salary - indigo
            "rgba(168, 85, 247, 1)",   // freelance - purple
            "rgba(234, 179, 8, 1)",    // investment - yellow
            "rgba(249, 115, 22, 1)",   // food - orange
            "rgba(59, 130, 246, 1)",   // transport - blue
            "rgba(168, 85, 247, 1)",   // housing - purple
            "rgba(14, 165, 233, 1)",   // utilities - sky
            "rgba(234, 179, 8, 1)",    // subscriptions - yellow
            "rgba(236, 72, 153, 1)",   // entertainment - pink
            "rgba(6, 182, 212, 1)",    // shopping - cyan
            "rgba(14, 165, 233, 1)",   // health - sky
            "rgba(99, 102, 241, 1)",   // insurance - indigo
            "rgba(234, 179, 8, 1)",    // services - yellow
            "rgba(148, 163, 184, 1)",  // other - slate
            "rgba(59, 130, 246, 1)",   // success - blue
            "rgba(249, 115, 22, 1)",   // destructive - orange
        ],
        dark: [
            "rgba(96, 165, 250, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(129, 140, 248, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(250, 204, 21, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(96, 165, 250, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(56, 189, 248, 1)",
            "rgba(250, 204, 21, 1)",
            "rgba(244, 114, 182, 1)",
            "rgba(34, 211, 238, 1)",
            "rgba(56, 189, 248, 1)",
            "rgba(129, 140, 248, 1)",
            "rgba(250, 204, 21, 1)",
            "rgba(148, 163, 184, 1)",
            "rgba(96, 165, 250, 1)",
            "rgba(251, 146, 60, 1)",
        ],
    },
    // Protanopia (red-blind) - uses blue/yellow
    protanopia: {
        light: [
            "rgba(59, 130, 246, 1)",   // income - blue
            "rgba(234, 179, 8, 1)",    // expenses - yellow
            "rgba(99, 102, 241, 1)",   // salary - indigo
            "rgba(168, 85, 247, 1)",   // freelance - purple
            "rgba(249, 115, 22, 1)",   // investment - orange
            "rgba(234, 179, 8, 1)",    // food - yellow
            "rgba(59, 130, 246, 1)",   // transport - blue
            "rgba(168, 85, 247, 1)",   // housing - purple
            "rgba(6, 182, 212, 1)",    // utilities - cyan
            "rgba(249, 115, 22, 1)",   // subscriptions - orange
            "rgba(236, 72, 153, 1)",   // entertainment - pink
            "rgba(6, 182, 212, 1)",    // shopping - cyan
            "rgba(14, 165, 233, 1)",   // health - sky
            "rgba(99, 102, 241, 1)",   // insurance - indigo
            "rgba(249, 115, 22, 1)",   // services - orange
            "rgba(148, 163, 184, 1)",  // other - slate
            "rgba(59, 130, 246, 1)",   // success - blue
            "rgba(234, 179, 8, 1)",    // destructive - yellow
        ],
        dark: [
            "rgba(96, 165, 250, 1)",
            "rgba(250, 204, 21, 1)",
            "rgba(129, 140, 248, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(250, 204, 21, 1)",
            "rgba(96, 165, 250, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(34, 211, 238, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(244, 114, 182, 1)",
            "rgba(34, 211, 238, 1)",
            "rgba(56, 189, 248, 1)",
            "rgba(129, 140, 248, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(148, 163, 184, 1)",
            "rgba(96, 165, 250, 1)",
            "rgba(250, 204, 21, 1)",
        ],
    },
    // Tritanopia (blue-yellow blind) - uses cyan/red/magenta
    tritanopia: {
        light: [
            "rgba(6, 182, 212, 1)",    // income - cyan
            "rgba(239, 68, 68, 1)",    // expenses - red
            "rgba(236, 72, 153, 1)",   // salary - pink
            "rgba(168, 85, 247, 1)",   // freelance - purple
            "rgba(249, 115, 22, 1)",   // investment - orange
            "rgba(239, 68, 68, 1)",    // food - red
            "rgba(236, 72, 153, 1)",   // transport - pink
            "rgba(168, 85, 247, 1)",   // housing - purple
            "rgba(20, 184, 166, 1)",   // utilities - teal
            "rgba(249, 115, 22, 1)",   // subscriptions - orange
            "rgba(192, 38, 211, 1)",   // entertainment - fuchsia
            "rgba(20, 184, 166, 1)",   // shopping - teal
            "rgba(6, 182, 212, 1)",    // health - cyan
            "rgba(168, 85, 247, 1)",   // insurance - purple
            "rgba(249, 115, 22, 1)",   // services - orange
            "rgba(148, 163, 184, 1)",  // other - slate
            "rgba(6, 182, 212, 1)",    // success - cyan
            "rgba(239, 68, 68, 1)",    // destructive - red
        ],
        dark: [
            "rgba(34, 211, 238, 1)",
            "rgba(248, 113, 113, 1)",
            "rgba(244, 114, 182, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(248, 113, 113, 1)",
            "rgba(244, 114, 182, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(45, 212, 191, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(217, 70, 239, 1)",
            "rgba(45, 212, 191, 1)",
            "rgba(34, 211, 238, 1)",
            "rgba(192, 132, 252, 1)",
            "rgba(251, 146, 60, 1)",
            "rgba(148, 163, 184, 1)",
            "rgba(34, 211, 238, 1)",
            "rgba(248, 113, 113, 1)",
        ],
    },
}

// Apply color palette to CSS variables
function applyColorPalette(mode: ColorBlindMode) {
    const root = document.documentElement
    const isDark = root.classList.contains("dark")
    const palette = COLOR_PALETTES[mode]
    const colors = isDark ? palette.dark : palette.light
    
    COLOR_VARS.forEach((varName, index) => {
        root.style.setProperty(varName, colors[index])
    })
}

export function ColorBlindProvider({ 
    children, 
    defaultMode = "none" 
}: { 
    children: React.ReactNode
    defaultMode?: ColorBlindMode 
}) {
    const [mode, setModeState] = React.useState<ColorBlindMode>(defaultMode)

    const setMode = React.useCallback((newMode: ColorBlindMode) => {
        setModeState(newMode)
        document.cookie = `${COLOR_BLIND_COOKIE}=${newMode};path=/;max-age=31536000`
        applyColorPalette(newMode)
    }, [])

    // Apply colors on mount and when theme changes
    React.useEffect(() => {
        applyColorPalette(mode)
        
        // Watch for dark mode changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === "class") {
                    applyColorPalette(mode)
                    break
                }
            }
        })
        
        observer.observe(document.documentElement, { attributes: true })
        return () => observer.disconnect()
    }, [mode])

    return (
        <ColorBlindContext.Provider value={{ mode, setMode }}>
            {children}
        </ColorBlindContext.Provider>
    )
}

export function useColorBlind() {
    const context = React.useContext(ColorBlindContext)
    if (!context) {
        throw new Error("useColorBlind must be used within a ColorBlindProvider")
    }
    return context
}
