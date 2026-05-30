//
//  use-os.ts
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Provides the use os React hook for Argent, encapsulating reusable state, effects, or
//  data-access behavior for consuming components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { useSyncExternalStore } from "react"

function isMacPlatform() {
  if (typeof navigator === "undefined") return false
  return (
    navigator.platform.toUpperCase().includes("MAC") ||
    navigator.userAgent.toUpperCase().includes("MAC")
  )
}

function subscribeOSSnapshot() {
  return () => {}
}

/**
 * Hook to detect the user's operating system
 * @returns Object with OS detection booleans and formatted shortcut key
 */
export function useOS() {
  const isMac = useSyncExternalStore(subscribeOSSnapshot, isMacPlatform, () => false)

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
