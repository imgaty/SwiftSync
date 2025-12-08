"use client"

import { useState, useEffect } from "react"

/**
 * Hook to detect the user's operating system
 * @returns Object with OS detection booleans and formatted shortcut key
 */
export function useOS() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    // Check if running on macOS using navigator.platform or userAgent
    const isMacOS =
      navigator.platform.toUpperCase().includes("MAC") ||
      navigator.userAgent.toUpperCase().includes("MAC")
    setIsMac(isMacOS)
  }, [])

  return {
    isMac,
    isWindows: !isMac, // Simplified: if not Mac, assume Windows/Linux
    /** The modifier key symbol: ⌘ on Mac, Ctrl on Windows/Linux */
    modKey: isMac ? "⌘" : "Ctrl",
    /** The modifier key name: Command on Mac, Ctrl on Windows/Linux */
    modKeyName: isMac ? "Command" : "Ctrl",
  }
}

/**
 * Utility function to format a keyboard shortcut string
 * @param key - The key to combine with the modifier (e.g., "B", "S", "Z")
 * @param modKey - The modifier key symbol (from useOS hook)
 * @returns Formatted shortcut string like "⌘ + B" or "Ctrl + B"
 */
export function formatShortcut(key: string, modKey: string): string {
  return `${modKey} + ${key}`
}
