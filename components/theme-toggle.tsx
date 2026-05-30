//
//  theme-toggle.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Theme toggle React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Contrast } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

import { Button } from "@/components/ui/button"
import { SmartTooltip } from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Contrast />
      </Button>
    )
  }

  return (
    <SmartTooltip text="Toggle theme" group="header" forceSide="bottom">
      <Button variant="ghost" size="icon" onClick={toggleTheme}>
        <Contrast />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </SmartTooltip>
  )
}
