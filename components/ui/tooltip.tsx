"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"

// Global tooltip delay - use this for consistent timing across all tooltips
export const TOOLTIP_DELAY = 400

// ==============================================================================
// SMART TOOLTIP REGISTRY - Module-level singleton for sibling coordination
// ==============================================================================

type Side = "top" | "right" | "bottom" | "left"

interface TooltipRegistryEntry {
    id: string
    side: Side
    groupId?: string
}

const tooltipRegistry = new Map<string, TooltipRegistryEntry>()

function registerTooltip(id: string, side: Side, groupId?: string) {
    tooltipRegistry.set(id, { id, side, groupId })
}

function unregisterTooltip(id: string) {
    tooltipRegistry.delete(id)
}

function getSiblingPreference(groupId?: string): Side | null {
    if (!groupId) return null

    const siblings = Array.from(tooltipRegistry.values()).filter(
        entry => entry.groupId === groupId
    )

    if (siblings.length === 0) return null

    const sideCounts = siblings.reduce((acc, entry) => {
        acc[entry.side] = (acc[entry.side] || 0) + 1
        return acc
    }, {} as Record<Side, number>)

    return Object.entries(sideCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Side || null
}

// ==============================================================================
// SMART TOOLTIP - Self-aware positioning
// ==============================================================================

interface SmartTooltipProps {
    children: React.ReactNode
    text: string
    /** Optional group ID - tooltips in the same group will try to be consistent */
    group?: string
    /** Force a specific side (overrides smart positioning) */
    forceSide?: Side
    /** Delay before showing (default: 400ms) */
    delay?: number
    /** Additional className for the tooltip content */
    className?: string
}

/**
 * SmartTooltip - A self-aware tooltip that automatically finds the best position
 * 
 * It considers:
 * 1. Available viewport space
 * 2. Neighboring interactive elements that shouldn't be occluded
 * 3. Sibling tooltips in the same group (for visual consistency)
 * 4. Disabled state of the trigger (shows faded tooltip)
 * 
 * Usage:
 * ```tsx
 * <SmartTooltip text="Remove chart">
 *     <button>X</button>
 * </SmartTooltip>
 * ```
 */
export function SmartTooltip({
    children,
    text,
    group,
    forceSide,
    delay = TOOLTIP_DELAY,
    className
}: SmartTooltipProps) {
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const [computedSide, setComputedSide] = React.useState<Side>("top")
    const [isDisabled, setIsDisabled] = React.useState(false)
    const tooltipId = React.useId()

    // Detect if the child element is disabled
    React.useEffect(() => {
        const trigger = triggerRef.current
        if (!trigger) return

        const checkDisabled = () => {
            // Check various ways an element can be disabled
            const isElementDisabled =
                trigger.hasAttribute('disabled') ||
                trigger.getAttribute('aria-disabled') === 'true' ||
                trigger.classList.contains('disabled') ||
                (trigger as HTMLButtonElement).disabled === true
            setIsDisabled(isElementDisabled)
        }

        // Initial check
        checkDisabled()

        // Watch for attribute changes
        const observer = new MutationObserver(checkDisabled)
        observer.observe(trigger, { attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'class'] })

        return () => observer.disconnect()
    }, [])

    const calculateBestSide = React.useCallback(() => {
        if (forceSide) return forceSide

        const trigger = triggerRef.current
        if (!trigger) return "top"

        const rect = trigger.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Estimate tooltip size (we'll be conservative)
        const tooltipWidth = Math.min(200, text.length * 8 + 24)
        const tooltipHeight = 32
        const offset = 8

        // Calculate available space in each direction
        const spaceTop = rect.top
        const spaceBottom = viewportHeight - rect.bottom
        const spaceLeft = rect.left
        const spaceRight = viewportWidth - rect.right

        // Check for neighboring interactive elements that could be occluded
        const neighborPadding = 60 // How far to look for neighbors
        const neighbors = {
            top: [] as Element[],
            bottom: [] as Element[],
            left: [] as Element[],
            right: [] as Element[],
        }

        // Find all interactive elements nearby
        const interactiveSelectors = 'button, a, input, select, [role="button"], [tabindex]:not([tabindex="-1"])'
        const allInteractive = document.querySelectorAll(interactiveSelectors)

        allInteractive.forEach(el => {
            if (el === trigger || trigger.contains(el)) return

            const elRect = el.getBoundingClientRect()

            // Check if element is above
            if (elRect.bottom <= rect.top && elRect.bottom >= rect.top - neighborPadding) {
                if (elRect.right > rect.left - 20 && elRect.left < rect.right + 20) {
                    neighbors.top.push(el)
                }
            }
            // Check if element is below
            if (elRect.top >= rect.bottom && elRect.top <= rect.bottom + neighborPadding) {
                if (elRect.right > rect.left - 20 && elRect.left < rect.right + 20) {
                    neighbors.bottom.push(el)
                }
            }
            // Check if element is to the left
            if (elRect.right <= rect.left && elRect.right >= rect.left - neighborPadding) {
                if (elRect.bottom > rect.top - 20 && elRect.top < rect.bottom + 20) {
                    neighbors.left.push(el)
                }
            }
            // Check if element is to the right
            if (elRect.left >= rect.right && elRect.left <= rect.right + neighborPadding) {
                if (elRect.bottom > rect.top - 20 && elRect.top < rect.bottom + 20) {
                    neighbors.right.push(el)
                }
            }
        })

        // Score each side (higher is better)
        const scores: Record<Side, number> = {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        }

        // Base score from available space
        if (spaceTop >= tooltipHeight + offset) scores.top += 10
        if (spaceBottom >= tooltipHeight + offset) scores.bottom += 10
        if (spaceLeft >= tooltipWidth + offset) scores.left += 10
        if (spaceRight >= tooltipWidth + offset) scores.right += 10

        // Penalize sides with neighbors that would be occluded
        scores.top -= neighbors.top.length * 15
        scores.bottom -= neighbors.bottom.length * 15
        scores.left -= neighbors.left.length * 15
        scores.right -= neighbors.right.length * 15

        // Small preference for bottom/right (natural reading direction)
        scores.bottom += 2
        scores.right += 1

        // Check sibling preference for consistency
        const siblingPref = getSiblingPreference(group)
        if (siblingPref && scores[siblingPref] > -5) {
            // Boost sibling preference if it's not a terrible choice
            scores[siblingPref] += 8
        }

        // Find the best side
        const bestSide = (Object.entries(scores) as [Side, number][])
            .sort((a, b) => b[1] - a[1])[0][0]

        return bestSide
    }, [forceSide, text.length, group])

    // Recalculate on mount and when relevant props change
    React.useEffect(() => {
        const side = calculateBestSide()
        setComputedSide(side)
        registerTooltip(tooltipId, side, group)

        return () => unregisterTooltip(tooltipId)
    }, [calculateBestSide, tooltipId, group])

    // Recalculate on window resize
    React.useEffect(() => {
        const handleResize = () => {
            const side = calculateBestSide()
            setComputedSide(side)
            registerTooltip(tooltipId, side, group)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [calculateBestSide, tooltipId, group])

    return (
        <TooltipProvider>
        <TooltipPrimitive.Root delayDuration={delay}>
            <TooltipPrimitive.Trigger ref={triggerRef} asChild>
                {children}
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    side={computedSide}
                    sideOffset={6}
                    collisionPadding={16}
                    avoidCollisions={true}
                    className={cn(
                        PRISM.animateIn,
                        PRISM.animateOut,
                        "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1",
                        "data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
                        "w-fit max-w-[220px] origin-(--radix-tooltip-content-transform-origin)",
                        PRISM.container,
                        "text-balance",
                        isDisabled
                            ? "bg-white/3 text-neutral-400"
                            : "",
                        className
                    )}
                >
                    {text}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
        </TooltipProvider>
    )
}

// ==============================================================================
// ORIGINAL TOOLTIP COMPONENTS (kept for backward compatibility)
// ==============================================================================

function TooltipProvider({
    delayDuration = 0,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
    return (
        <TooltipPrimitive.Provider
            data-slot="tooltip-provider"
            delayDuration={delayDuration}
            {...props}
        />
    )
}

function Tooltip({
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
    return (
        <TooltipProvider>
            <TooltipPrimitive.Root data-slot="tooltip" {...props} />
        </TooltipProvider>
    )
}

function TooltipTrigger({
    className,
    children,
    asChild,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
    return (
        <TooltipPrimitive.Trigger data-slot="tooltip-trigger" className={className} asChild={asChild} {...props}>
            {children}
        </TooltipPrimitive.Trigger>
    )
}

function TooltipContent({
    className,
    sideOffset = 6,
    collisionPadding = 16,
    children,
    disabled,
    ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & { disabled?: boolean }) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                collisionPadding={collisionPadding}
                avoidCollisions={true}
                className={cn(
                    PRISM.animateIn,
                    PRISM.animateOut,
                    "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
                    "w-fit max-w-[calc(100vw-2rem)] origin-(--radix-tooltip-content-transform-origin)",
                    PRISM.container,
                    "text-balance",
                    disabled
                        ? "bg-white/3 text-neutral-400"
                        : "",
                    className
                )}
                {...props}
            >
                {children}
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    )
}



/**
 * useCursorTooltip - A reusable hook for creating tooltips that follow the cursor
 * 
 * HOW IT WORKS:
 * 1. When mouse enters an element, a 500ms timer starts
 * 2. After the delay, tooltip becomes visible at the cursor position
 * 3. The position is calculated to stay within viewport bounds
 * 4. When mouse leaves (or you call hide()), tooltip disappears
 * 
 * USAGE:
 * ```tsx
 * function MyComponent() {
 *     const tooltip = useCursorTooltip()
 * 
 *     return (
 *         <>
 *             <button
 *                 onMouseEnter={tooltip.onMouseEnter}
 *                 onMouseLeave={tooltip.onMouseLeave}
 *                 onClick={() => { doSomething(); tooltip.hide() }}
 *             >
 *                 Hover me
 *             </button>
 * 
 *             {tooltip.isVisible && (
 *                 <div
 *                     ref={tooltip.ref}
 *                     className="fixed px-3 py-1.5 text-white text-xs bg-foreground rounded-md pointer-events-none z-1000"
 *                     style={{ left: tooltip.position.x, top: tooltip.position.y }}
 *                 >
 *                     Tooltip content here
 *                 </div>
 *             )}
 *         </>
 *     )
 * }
 * ```
 * 
 * OPTIONS:
 * - delay: Time in ms before tooltip appears (default: 500)
 * - disabled: If true, tooltip won't show (useful for conditional tooltips)
 * 
 * RETURNS:
 * - isVisible: Whether tooltip should be rendered
 * - position: { x, y } coordinates for the tooltip
 * - ref: Attach to your tooltip element (needed for size calculations)
 * - onMouseEnter: Attach to the trigger element
 * - onMouseLeave: Attach to the trigger element
 * - hide: Manually hide the tooltip (call on click, etc.)
 */
function useCursorTooltip(options: { delay?: number; disabled?: boolean } = {}) {
    const { delay = 500, disabled = false } = options

    const [tooltip, setTooltip] = React.useState({ show: false, x: 0, y: 0 })
    const [position, setPosition] = React.useState({ x: 0, y: 0 })
    const ref = React.useRef<HTMLDivElement>(null)
    const timeout = React.useRef<NodeJS.Timeout | null>(null)

    // Cleanup timeout on unmount
    React.useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current) }, [])

    // Calculate optimal position when tooltip becomes visible
    // Ensures tooltip stays within viewport bounds
    React.useEffect(() => {
        if (!tooltip.show || !ref.current) return

        const rect = ref.current.getBoundingClientRect()
        const padding = 8      // Distance from cursor
        const margin = 16      // Minimum distance from viewport edge

        let x = tooltip.x + padding
        let y = tooltip.y + padding

        // Shift left if would overflow right edge
        if (x + rect.width > window.innerWidth - margin) x = tooltip.x - rect.width - padding
        // Shift up if would overflow bottom edge
        if (y + rect.height > window.innerHeight - margin) y = tooltip.y - rect.height - padding
        // Clamp to viewport bounds
        if (x < margin) x = margin
        if (y < margin) y = margin

        setPosition({ x, y })
    }, [tooltip.show, tooltip.x, tooltip.y])

    const onMouseEnter = React.useCallback((e: React.MouseEvent) => {
        if (disabled) return
        timeout.current = setTimeout(() => setTooltip({ show: true, x: e.clientX, y: e.clientY }), delay)
    }, [delay, disabled])

    const onMouseLeave = React.useCallback(() => {
        if (timeout.current) clearTimeout(timeout.current)
        setTooltip(t => t.show ? { ...t, show: false } : t)
    }, [])

    const hide = React.useCallback(() => {
        if (timeout.current) clearTimeout(timeout.current)
        setTooltip(t => t.show ? { ...t, show: false } : t)
    }, [])

    return {
        isVisible: tooltip.show,
        position,
        ref,
        onMouseEnter,
        onMouseLeave,
        hide,
    }
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, useCursorTooltip }
