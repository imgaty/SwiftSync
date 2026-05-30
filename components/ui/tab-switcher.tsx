//
//  tab-switcher.tsx
//  Argent
//
//  Created by hilario on 30 May 2026 at 19:28.
//  Description: Defines the reusable Tab switcher UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"

export type TabSwitcherProps = React.HTMLAttributes<HTMLDivElement> & {
    ariaLabel: string
    fullWidth?: boolean
}

export type TabSwitcherItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive: boolean
}

export type TabSwitcherIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isActive?: boolean
}

type ActiveRect = {
    x: number
    y: number
    width: number
    height: number
}

function setForwardedRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
    if (typeof ref === "function") {
        ref(value)
        return
    }

    if (ref) (ref as React.MutableRefObject<T | null>).current = value
}

const roundedControl = "rounded-full"

const tabSwitcherSurface = cn(
    PRISM.cardSurface,
    "relative isolate inline-flex min-h-9 min-w-0 items-center gap-1 overflow-hidden p-1",
    roundedControl,
)

const tabSwitcherButtonBase = cn(
    "relative z-[2] inline-flex h-7 min-w-0 items-center justify-center gap-1.5 border border-transparent bg-transparent",
    roundedControl,
    "text-[12px] font-semibold leading-none outline-none",
    "transition-colors duration-150 ease-out",
    "hover:bg-transparent hover:shadow-none active:scale-100",
    "focus-visible:ring-2 focus-visible:ring-focus/70",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
)

const tabSwitcherActiveIndicator = cn(
    PRISM.cardSurface,
    "pointer-events-none absolute left-0 top-0 z-[1] border",
    roundedControl,
    "bg-[color:color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] dark:bg-white/[0.105]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
    "will-change-transform",
    "transition-[opacity,transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
)

const tabSwitcherButtonActive = "text-foreground"

const tabSwitcherButtonInactive = cn(
    "text-foreground-secondary",
    "hover:text-foreground",
)

export const TabSwitcher = React.forwardRef<HTMLDivElement, TabSwitcherProps>(
    function TabSwitcher({
        ariaLabel,
        children,
        className,
        fullWidth,
        role = "group",
        ...props
    }, ref) {
        const rootRef = React.useRef<HTMLDivElement | null>(null)
        const [activeRect, setActiveRect] = React.useState<ActiveRect | null>(null)

        const setRootRef = React.useCallback((node: HTMLDivElement | null) => {
            rootRef.current = node
            setForwardedRef(ref, node)
        }, [ref])

        const measureActiveRect = React.useCallback(() => {
            const root = rootRef.current
            if (!root) return null

            const active = root.querySelector<HTMLElement>("[data-tab-switcher-item][data-active='true']")
            if (!active) return null

            const rootBox = root.getBoundingClientRect()
            const activeBox = active.getBoundingClientRect()

            if (activeBox.width <= 0 || activeBox.height <= 0) return null

            return {
                x: activeBox.left - rootBox.left,
                y: activeBox.top - rootBox.top,
                width: activeBox.width,
                height: activeBox.height,
            }
        }, [])

        const updateActiveRect = React.useCallback(() => {
            const nextRect = measureActiveRect()

            setActiveRect((current) => {
                if (!nextRect) return null

                const isSameRect =
                    current &&
                    Math.abs(current.x - nextRect.x) < 0.5 &&
                    Math.abs(current.y - nextRect.y) < 0.5 &&
                    Math.abs(current.width - nextRect.width) < 0.5 &&
                    Math.abs(current.height - nextRect.height) < 0.5

                if (isSameRect) {
                    return current
                }

                return nextRect
            })
        }, [measureActiveRect])

        React.useLayoutEffect(() => {
            updateActiveRect()
        })

        React.useEffect(() => {
            const root = rootRef.current
            if (!root) return

            let frame = 0
            const scheduleUpdate = () => {
                window.cancelAnimationFrame(frame)
                frame = window.requestAnimationFrame(updateActiveRect)
            }

            const observer = new ResizeObserver(scheduleUpdate)
            observer.observe(root)

            window.addEventListener("resize", scheduleUpdate)

            return () => {
                window.cancelAnimationFrame(frame)
                observer.disconnect()
                window.removeEventListener("resize", scheduleUpdate)
            }
        }, [updateActiveRect])

        return (
            <div
                ref={setRootRef}
                role={role}
                aria-label={ariaLabel}
                className={cn(tabSwitcherSurface, fullWidth && "w-full", className)}
                {...props}
            >
                <span
                    aria-hidden="true"
                    className={cn(tabSwitcherActiveIndicator, activeRect ? "opacity-100" : "opacity-0")}
                    style={activeRect ? {
                        width: activeRect.width,
                        height: activeRect.height,
                        transform: `translate3d(${activeRect.x}px, ${activeRect.y}px, 0)`,
                    } : undefined}
                />
                {children}
            </div>
        )
    }
)

export const TabSwitcherItem = React.forwardRef<HTMLButtonElement, TabSwitcherItemProps>(
    function TabSwitcherItem({
        children,
        className,
        isActive,
        type = "button",
        ...props
    }, ref) {
        return (
            <Button variant="ghost"
                ref={ref}
                type={type}
                aria-pressed={isActive}
                data-tab-switcher-item
                data-active={isActive ? "true" : "false"}
                className={cn(
                    tabSwitcherButtonBase,
                    "px-3",
                    isActive ? tabSwitcherButtonActive : tabSwitcherButtonInactive,
                    className,
                )}
                {...props}
            >
                {children}
            </Button>
        )
    }
)

export const TabSwitcherIconButton = React.forwardRef<HTMLButtonElement, TabSwitcherIconButtonProps>(
    function TabSwitcherIconButton({
        children,
        className,
        isActive = false,
        type = "button",
        ...props
    }, ref) {
        return (
            <Button variant="ghost"
                ref={ref}
                type={type}
                aria-pressed={isActive || undefined}
                data-tab-switcher-item
                data-active={isActive ? "true" : "false"}
                className={cn(
                    tabSwitcherButtonBase,
                    "size-7 px-0",
                    isActive ? tabSwitcherButtonActive : tabSwitcherButtonInactive,
                    className,
                )}
                {...props}
            >
                {children}
            </Button>
        )
    }
)
