//
//  surface-spotlight-provider.tsx
//  Argent
//
//  Created by hilario on 29 May 2026 at 15:21.
//  Description: Implements the Surface spotlight provider React component for Argent, encapsulating
//  reusable interface structure, state handling, and presentation logic for feature
//  screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

const SPOTLIGHT_SELECTOR = ".spotlight-surface"
const TOUCH_FADE_DELAY_MS = 140

function getSpotlightSurface(target: EventTarget | null) {
    return target instanceof Element
        ? target.closest<HTMLElement>(SPOTLIGHT_SELECTOR)
        : null
}

function positionSpotlight(surface: HTMLElement, clientX: number, clientY: number) {
    const rect = surface.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100

    surface.style.setProperty("--spotlight-x", `${Math.max(0, Math.min(100, x))}%`)
    surface.style.setProperty("--spotlight-y", `${Math.max(0, Math.min(100, y))}%`)
    surface.style.setProperty("--spotlight-opacity", "1")
    surface.dataset.spotlightActive = "true"
}

function clearSpotlight(surface: HTMLElement | null) {
    if (!surface) return

    surface.style.setProperty("--spotlight-opacity", "0")
    delete surface.dataset.spotlightActive
}

export function SurfaceSpotlightProvider() {
    React.useEffect(() => {
        let activeSurface: HTMLElement | null = null
        let touchFadeTimer: number | null = null

        const clearTouchTimer = () => {
            if (!touchFadeTimer) return
            window.clearTimeout(touchFadeTimer)
            touchFadeTimer = null
        }

        const activateSurface = (surface: HTMLElement | null, clientX: number, clientY: number) => {
            clearTouchTimer()

            if (activeSurface && activeSurface !== surface) {
                clearSpotlight(activeSurface)
            }

            activeSurface = surface
            if (surface) positionSpotlight(surface, clientX, clientY)
        }

        const fadeActiveSurface = (delay = 0) => {
            clearTouchTimer()

            if (delay > 0) {
                touchFadeTimer = window.setTimeout(() => {
                    clearSpotlight(activeSurface)
                    activeSurface = null
                    touchFadeTimer = null
                }, delay)
                return
            }

            clearSpotlight(activeSurface)
            activeSurface = null
        }

        const isFingerPointer = (event: PointerEvent) => event.pointerType === "touch"

        const onPointerMove = (event: PointerEvent) => {
            if (!isFingerPointer(event)) return

            const surface = getSpotlightSurface(event.target)
            activateSurface(surface, event.clientX, event.clientY)
        }

        const onPointerDown = (event: PointerEvent) => {
            if (!isFingerPointer(event)) return

            const surface = getSpotlightSurface(event.target)
            activateSurface(surface, event.clientX, event.clientY)
        }

        const onPointerOut = (event: PointerEvent) => {
            if (!isFingerPointer(event)) return
            if (!activeSurface) return

            const nextTarget = event.relatedTarget
            if (nextTarget instanceof Node && activeSurface.contains(nextTarget)) return
            fadeActiveSurface(TOUCH_FADE_DELAY_MS)
        }

        const onPointerEnd = (event: PointerEvent) => {
            if (!isFingerPointer(event)) return
            fadeActiveSurface(TOUCH_FADE_DELAY_MS)
        }

        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0]
            if (!touch) return
            const surface = getSpotlightSurface(event.target)
                ?? getSpotlightSurface(document.elementFromPoint(touch.clientX, touch.clientY))
            activateSurface(surface, touch.clientX, touch.clientY)
        }

        const onTouchEnd = () => fadeActiveSurface(TOUCH_FADE_DELAY_MS)

        if (window.PointerEvent) {
            document.addEventListener("pointermove", onPointerMove, { passive: true })
            document.addEventListener("pointerdown", onPointerDown, { passive: true })
            document.addEventListener("pointerout", onPointerOut, { passive: true })
            document.addEventListener("pointerup", onPointerEnd, { passive: true })
            document.addEventListener("pointercancel", onPointerEnd, { passive: true })
        } else {
            document.addEventListener("touchmove", onTouchMove, { passive: true })
            document.addEventListener("touchstart", onTouchMove, { passive: true })
            document.addEventListener("touchend", onTouchEnd, { passive: true })
            document.addEventListener("touchcancel", onTouchEnd, { passive: true })
        }

        return () => {
            clearTouchTimer()
            if (window.PointerEvent) {
                document.removeEventListener("pointermove", onPointerMove)
                document.removeEventListener("pointerdown", onPointerDown)
                document.removeEventListener("pointerout", onPointerOut)
                document.removeEventListener("pointerup", onPointerEnd)
                document.removeEventListener("pointercancel", onPointerEnd)
            } else {
                document.removeEventListener("touchmove", onTouchMove)
                document.removeEventListener("touchstart", onTouchMove)
                document.removeEventListener("touchend", onTouchEnd)
                document.removeEventListener("touchcancel", onTouchEnd)
            }
        }
    }, [])

    return null
}
