"use client"

import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Dropdown,
  DropdownThemeSection,
  DropdownColorVisionSubmenu,
  DropdownUniversalShell,
  DropdownTrigger,
  DropdownSeparator,
} from "@/components/ui/app-dropdown"
import { SmartTooltip } from "@/components/ui/tooltip"
import { useColorBlind } from "@/components/colorblind-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { mode: colorBlindMode, setMode: setColorBlindMode } = useColorBlind()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8">
        <Sun className="size-4" />
      </Button>
    )
  }

  return (
    <Dropdown>
      <SmartTooltip text="Theme & accessibility" group="header">
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownTrigger>
      </SmartTooltip>

      <DropdownUniversalShell width={210}>
        <DropdownThemeSection
          selectedTheme={theme}
          onSelectTheme={setTheme}
        />
        <DropdownSeparator className="mx-2 my-[5px]" />
        <DropdownColorVisionSubmenu
          selectedMode={colorBlindMode}
          onSelectMode={(mode) => setColorBlindMode(mode as "none" | "deuteranopia" | "protanopia" | "tritanopia")}
        />
      </DropdownUniversalShell>
    </Dropdown>
  )
}
