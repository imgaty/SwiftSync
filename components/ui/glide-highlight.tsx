//
//  glide-highlight.tsx
//  Argent
//
//  Created by hilario on 30 May 2026 at 19:28.
//  Description: Defines the reusable Glide highlight UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"

const DEFAULT_ITEM_SELECTOR =
    "[data-glide-item]:not([data-disabled]):not([aria-disabled='true']):not(:disabled)"

const VERTICAL_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"])
const HORIZONTAL_KEYS = new Set(["ArrowRight", "ArrowLeft", "Home", "End"])

let generatedId = 0

type GlideRect = {
    x: number
    y: number
    width: number
    height: number
}

type GlideReason = "pointer" | "keyboard" | "focus" | "mutation" | "default" | "click"

type GlideActivationEvent =
    | React.PointerEvent<HTMLElement>
    | React.KeyboardEvent<HTMLElement>
    | React.MouseEvent<HTMLElement>

type CachedItem = {
    id: string
    element: HTMLElement
    rect: DOMRect
}

type UseGlideHighlightOptions = {
    surfaceRef: React.RefObject<HTMLElement | null>
    itemSelector?: string
    defaultActiveId?: string
    initializeToFirst?: boolean
    keyboardNavigation?: boolean
    activateOnPointerUp?: boolean
    activateOnClick?: boolean
    activateOnKeyDown?: boolean
    preventTouchScroll?: boolean
    orientation?: "vertical" | "horizontal" | "both"
    onActiveIdChange?: (id: string, element: HTMLElement, reason: GlideReason) => void
    onActivate?: (id: string, element: HTMLElement, event: GlideActivationEvent) => void
    onEscapeKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void
}

export type PrismGlideMenuProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onActivate"> &
    Omit<UseGlideHighlightOptions, "surfaceRef"> & {
        highlightClassName?: string
        contentClassName?: string
    }

export type PrismGlideMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    glideId?: string
}

function isHTMLElement(value: unknown): value is HTMLElement {
    return value instanceof HTMLElement
}

function ensureGlideId(element: HTMLElement) {
    const existing = element.dataset.glideItem || element.id
    if (existing) {
        if (!element.dataset.glideItem) element.dataset.glideItem = existing
        if (!element.id) element.id = existing
        return existing
    }

    generatedId += 1
    const id = `prism-glide-${generatedId}`
    element.dataset.glideItem = id
    element.id = id
    return id
}

function isUsableItem(element: HTMLElement) {
    if (element.hasAttribute("disabled")) return false
    if (element.getAttribute("aria-disabled") === "true") return false
    if (element.dataset.disabled !== undefined) return false

    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
}

function getItems(root: HTMLElement, itemSelector: string) {
    return Array.from(root.querySelectorAll<HTMLElement>(itemSelector)).filter(isUsableItem)
}

function findItemFromTarget(target: EventTarget | null, root: HTMLElement, itemSelector: string) {
    if (!isHTMLElement(target)) return null
    const item = target.closest<HTMLElement>(itemSelector)
    return item && root.contains(item) ? item : null
}

function measureRelativeToSurface(surface: HTMLElement, element: HTMLElement): GlideRect {
    const surfaceRect = surface.getBoundingClientRect()
    const itemRect = element.getBoundingClientRect()

    return {
        x: itemRect.left - surfaceRect.left,
        y: itemRect.top - surfaceRect.top,
        width: itemRect.width,
        height: itemRect.height,
    }
}

function setPointerVars(surface: HTMLElement, clientX: number, clientY: number, visible: boolean) {
    void surface
    void clientX
    void clientY
    void visible
}

function matchesPoint(item: CachedItem, clientX: number, clientY: number) {
    return (
        clientX >= item.rect.left &&
        clientX <= item.rect.right &&
        clientY >= item.rect.top &&
        clientY <= item.rect.bottom
    )
}

export function useGlideHighlight({
    surfaceRef,
    itemSelector = DEFAULT_ITEM_SELECTOR,
    defaultActiveId,
    initializeToFirst = true,
    keyboardNavigation = true,
    activateOnPointerUp = false,
    activateOnClick = false,
    activateOnKeyDown = true,
    preventTouchScroll = activateOnPointerUp,
    orientation = "vertical",
    onActiveIdChange,
    onActivate,
    onEscapeKeyDown,
}: UseGlideHighlightOptions) {
    const [activeId, setActiveId] = React.useState(defaultActiveId ?? "")
    const [rect, setRect] = React.useState<GlideRect | null>(null)
    const [visible, setVisible] = React.useState(false)

    const activeElementRef = React.useRef<HTMLElement | null>(null)
    const rectFrameRef = React.useRef<number | null>(null)
    const cacheRef = React.useRef<CachedItem[]>([])
    const draggingPointerIdRef = React.useRef<number | null>(null)
    const suppressClickRef = React.useRef(false)
    const suppressClickTimerRef = React.useRef<number | null>(null)
    const glowTimerRef = React.useRef<number | null>(null)

    const clearGlowTimer = React.useCallback(() => {
        if (glowTimerRef.current === null) return
        window.clearTimeout(glowTimerRef.current)
        glowTimerRef.current = null
    }, [])

    const fadeGlow = React.useCallback((delay = 0) => {
        const surface = surfaceRef.current
        if (!surface) return

        clearGlowTimer()
        if (delay > 0) {
            glowTimerRef.current = window.setTimeout(() => {
                surface.style.setProperty("--spotlight-opacity", "0")
                glowTimerRef.current = null
            }, delay)
            return
        }

        surface.style.setProperty("--spotlight-opacity", "0")
    }, [clearGlowTimer, surfaceRef])

    const scheduleMeasure = React.useCallback((element = activeElementRef.current) => {
        const surface = surfaceRef.current
        if (!surface || !element || !surface.contains(element)) return

        if (rectFrameRef.current !== null) {
            window.cancelAnimationFrame(rectFrameRef.current)
        }

        rectFrameRef.current = window.requestAnimationFrame(() => {
            rectFrameRef.current = null
            if (!surfaceRef.current || !element.isConnected || !surfaceRef.current.contains(element)) return
            setRect(measureRelativeToSurface(surfaceRef.current, element))
            setVisible(true)
        })
    }, [surfaceRef])

    const setActiveElement = React.useCallback((element: HTMLElement, reason: GlideReason) => {
        const id = ensureGlideId(element)

        activeElementRef.current = element
        setActiveId(id)
        onActiveIdChange?.(id, element, reason)
        scheduleMeasure(element)
    }, [onActiveIdChange, scheduleMeasure])

    const clearActive = React.useCallback(() => {
        activeElementRef.current = null
        setActiveId("")
        setRect(null)
        setVisible(false)
    }, [])

    const refreshItemCache = React.useCallback(() => {
        const surface = surfaceRef.current
        if (!surface) return []

        const items = getItems(surface, itemSelector).map((element) => ({
            id: ensureGlideId(element),
            element,
            rect: element.getBoundingClientRect(),
        }))

        cacheRef.current = items
        return items
    }, [itemSelector, surfaceRef])

    const findItemAtPoint = React.useCallback((clientX: number, clientY: number) => {
        const surface = surfaceRef.current
        if (!surface) return null

        const cached = cacheRef.current.length ? cacheRef.current : refreshItemCache()
        for (let i = cached.length - 1; i >= 0; i -= 1) {
            if (matchesPoint(cached[i], clientX, clientY)) return cached[i].element
        }

        return findItemFromTarget(document.elementFromPoint(clientX, clientY), surface, itemSelector)
    }, [itemSelector, refreshItemCache, surfaceRef])

    const activateElement = React.useCallback((element: HTMLElement, event: GlideActivationEvent) => {
        if (!onActivate) return
        const id = ensureGlideId(element)
        onActivate(id, element, event)
    }, [onActivate])

    const suppressNextClick = React.useCallback(() => {
        suppressClickRef.current = true
        if (suppressClickTimerRef.current !== null) {
            window.clearTimeout(suppressClickTimerRef.current)
        }
        suppressClickTimerRef.current = window.setTimeout(() => {
            suppressClickRef.current = false
            suppressClickTimerRef.current = null
        }, 220)
    }, [])

    const moveActiveByKey = React.useCallback((key: string, event: React.KeyboardEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        const items = getItems(surface, itemSelector)
        if (!items.length) return

        event.preventDefault()

        const activeElement = activeElementRef.current && surface.contains(activeElementRef.current)
            ? activeElementRef.current
            : findItemFromTarget(document.activeElement, surface, itemSelector)

        const currentIndex = activeElement ? Math.max(0, items.indexOf(activeElement)) : 0
        let nextIndex = currentIndex

        if (key === "Home") nextIndex = 0
        if (key === "End") nextIndex = items.length - 1
        if (key === "ArrowDown" || key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length
        if (key === "ArrowUp" || key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length

        const next = items[nextIndex]
        setActiveElement(next, "keyboard")
        next.focus({ preventScroll: true })
    }, [itemSelector, setActiveElement, surfaceRef])

    const handlePointerEnterCapture = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        clearGlowTimer()
        setPointerVars(surface, event.clientX, event.clientY, true)

        const item = findItemFromTarget(event.target, surface, itemSelector)
        if (item) setActiveElement(item, "pointer")
    }, [clearGlowTimer, itemSelector, setActiveElement, surfaceRef])

    const handlePointerDownCapture = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        clearGlowTimer()
        setPointerVars(surface, event.clientX, event.clientY, true)
        refreshItemCache()

        const item = findItemAtPoint(event.clientX, event.clientY)
        if (!item) return

        setActiveElement(item, "pointer")

        if (activateOnPointerUp) {
            draggingPointerIdRef.current = event.pointerId

            if (surface.setPointerCapture) {
                try {
                    surface.setPointerCapture(event.pointerId)
                } catch {
                    // Pointer capture can fail if the browser has already ended the pointer.
                }
            }
        }

        if (preventTouchScroll && event.pointerType !== "mouse") {
            event.preventDefault()
        }
    }, [activateOnPointerUp, clearGlowTimer, findItemAtPoint, preventTouchScroll, refreshItemCache, setActiveElement, surfaceRef])

    const handlePointerMoveCapture = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        clearGlowTimer()
        setPointerVars(surface, event.clientX, event.clientY, true)

        const isDragging = draggingPointerIdRef.current === event.pointerId
        const item = isDragging
            ? findItemAtPoint(event.clientX, event.clientY)
            : findItemFromTarget(event.target, surface, itemSelector)

        if (item && item !== activeElementRef.current) {
            setActiveElement(item, "pointer")
        }

        if (preventTouchScroll && isDragging && event.pointerType !== "mouse") {
            event.preventDefault()
        }
    }, [clearGlowTimer, findItemAtPoint, itemSelector, preventTouchScroll, setActiveElement, surfaceRef])

    const handlePointerUpCapture = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        setPointerVars(surface, event.clientX, event.clientY, true)

        const wasDragging = draggingPointerIdRef.current === event.pointerId
        if (wasDragging) {
            const item = findItemAtPoint(event.clientX, event.clientY) ?? activeElementRef.current
            if (item) setActiveElement(item, "pointer")

            if (activateOnPointerUp && item) {
                event.preventDefault()
                event.stopPropagation()
                suppressNextClick()
                activateElement(item, event)
            }
        }

        draggingPointerIdRef.current = null
        if (surface.releasePointerCapture) {
            try {
                surface.releasePointerCapture(event.pointerId)
            } catch {
                // Some browsers release capture automatically before this point.
            }
        }

        fadeGlow(120)
    }, [activateElement, activateOnPointerUp, fadeGlow, findItemAtPoint, setActiveElement, suppressNextClick, surfaceRef])

    const handlePointerCancelCapture = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        draggingPointerIdRef.current = null
        if (surface?.releasePointerCapture) {
            try {
                surface.releasePointerCapture(event.pointerId)
            } catch {
                // Safe no-op.
            }
        }
        fadeGlow(80)
    }, [fadeGlow, surfaceRef])

    const handlePointerLeaveCapture = React.useCallback(() => {
        if (draggingPointerIdRef.current !== null) return
        fadeGlow(80)
    }, [fadeGlow])

    const handleFocusCapture = React.useCallback((event: React.FocusEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        const item = findItemFromTarget(event.target, surface, itemSelector)
        if (item) setActiveElement(item, "focus")
    }, [itemSelector, setActiveElement, surfaceRef])

    const handleClickCapture = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
        const surface = surfaceRef.current
        if (!surface) return

        if (suppressClickRef.current) {
            event.preventDefault()
            event.stopPropagation()
            suppressClickRef.current = false
            return
        }

        if (!activateOnClick) return

        const item = findItemFromTarget(event.target, surface, itemSelector)
        if (!item) return

        event.preventDefault()
        event.stopPropagation()
        setActiveElement(item, "click")
        activateElement(item, event)
    }, [activateElement, activateOnClick, itemSelector, setActiveElement, surfaceRef])

    const handleKeyDownCapture = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") {
            onEscapeKeyDown?.(event)
            return
        }

        if (!keyboardNavigation) return

        const keySet = orientation === "horizontal"
            ? HORIZONTAL_KEYS
            : orientation === "both"
                ? new Set([...VERTICAL_KEYS, ...HORIZONTAL_KEYS])
                : VERTICAL_KEYS

        if (keySet.has(event.key)) {
            moveActiveByKey(event.key, event)
            return
        }

        if ((event.key === "Enter" || event.key === " ") && activateOnKeyDown) {
            const active = activeElementRef.current
            if (!active) return
            event.preventDefault()
            activateElement(active, event)
        }
    }, [activateElement, activateOnKeyDown, keyboardNavigation, moveActiveByKey, onEscapeKeyDown, orientation])

    React.useLayoutEffect(() => {
        const surface = surfaceRef.current
        if (!surface) return

        const initialize = () => {
            const items = refreshItemCache()
            const preferred =
                (defaultActiveId ? items.find((item) => item.id === defaultActiveId) : undefined) ??
                (initializeToFirst ? items[0] : undefined)

            if (preferred) {
                setActiveElement(preferred.element, "default")
                return
            }

            clearActive()
        }

        const frame = window.requestAnimationFrame(initialize)
        return () => window.cancelAnimationFrame(frame)
    }, [clearActive, defaultActiveId, initializeToFirst, refreshItemCache, setActiveElement, surfaceRef])

    React.useEffect(() => {
        const surface = surfaceRef.current
        if (!surface) return

        const observer = new MutationObserver((mutations) => {
            const needsCache = mutations.some((mutation) => mutation.type === "childList")
            if (needsCache) refreshItemCache()

            const highlighted = surface.querySelector<HTMLElement>(
                `${itemSelector}[data-highlighted], ${itemSelector}[data-state="open"]`,
            )
            if (highlighted) {
                setActiveElement(highlighted, "mutation")
            } else {
                scheduleMeasure()
            }
        })

        observer.observe(surface, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["data-highlighted", "data-state", "disabled", "aria-disabled", "data-disabled"],
        })

        return () => observer.disconnect()
    }, [itemSelector, refreshItemCache, scheduleMeasure, setActiveElement, surfaceRef])

    React.useEffect(() => {
        const surface = surfaceRef.current
        if (!surface || typeof ResizeObserver === "undefined") return

        const resizeObserver = new ResizeObserver(() => {
            refreshItemCache()
            scheduleMeasure()
        })

        resizeObserver.observe(surface)
        getItems(surface, itemSelector).forEach((item) => resizeObserver.observe(item))

        return () => resizeObserver.disconnect()
    }, [itemSelector, refreshItemCache, scheduleMeasure, surfaceRef])

    React.useEffect(() => {
        const handleResize = () => {
            refreshItemCache()
            scheduleMeasure()
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [refreshItemCache, scheduleMeasure])

    React.useEffect(() => {
        return () => {
            clearGlowTimer()
            if (rectFrameRef.current !== null) {
                window.cancelAnimationFrame(rectFrameRef.current)
            }
            if (suppressClickTimerRef.current !== null) {
                window.clearTimeout(suppressClickTimerRef.current)
            }
        }
    }, [clearGlowTimer])

    return {
        activeId,
        rect,
        visible,
        menuHandlers: {
            onPointerEnter: handlePointerEnterCapture,
            onPointerDownCapture: handlePointerDownCapture,
            onPointerMoveCapture: handlePointerMoveCapture,
            onPointerUpCapture: handlePointerUpCapture,
            onPointerCancelCapture: handlePointerCancelCapture,
            onPointerLeave: handlePointerLeaveCapture,
            onFocusCapture: handleFocusCapture,
            onClickCapture: handleClickCapture,
            onKeyDownCapture: handleKeyDownCapture,
        },
        refreshItemCache,
        setActiveElement,
        clearActive,
    }
}

export function GlideHighlight({
    rect,
    visible,
    className,
}: {
    rect: GlideRect | null
    visible: boolean
    className?: string
}) {
    void rect
    void visible
    void className

    // Compatibility shim: callers can keep their menu bookkeeping, while the
    // visual state is handled by static item hover/active styles again.
    return null
}

export const PrismGlideMenu = React.forwardRef<HTMLDivElement, PrismGlideMenuProps>(
    function PrismGlideMenu({
        children,
        className,
        contentClassName,
        highlightClassName,
        itemSelector,
        defaultActiveId,
        keyboardNavigation = true,
        activateOnPointerUp,
        activateOnClick,
        activateOnKeyDown,
        preventTouchScroll,
        orientation,
        onActiveIdChange,
        onActivate,
        onEscapeKeyDown,
        tabIndex,
        ...props
    }, forwardedRef) {
        const surfaceRef = React.useRef<HTMLDivElement>(null)
        const composedRef = React.useCallback((node: HTMLDivElement | null) => {
            surfaceRef.current = node
            if (typeof forwardedRef === "function") {
                forwardedRef(node)
            } else if (forwardedRef) {
                forwardedRef.current = node
            }
        }, [forwardedRef])
        const shouldPreventTouchScroll = preventTouchScroll ?? activateOnPointerUp ?? false
        const { activeId, rect, visible, menuHandlers } = useGlideHighlight({
            surfaceRef,
            itemSelector,
            defaultActiveId,
            keyboardNavigation,
            activateOnPointerUp,
            activateOnClick,
            activateOnKeyDown,
            preventTouchScroll: shouldPreventTouchScroll,
            orientation,
            onActiveIdChange,
            onActivate,
            onEscapeKeyDown,
        })

        return (
            <div
                ref={composedRef}
                data-prism-glide-menu=""
                aria-activedescendant={activeId || undefined}
                tabIndex={tabIndex ?? (keyboardNavigation ? 0 : undefined)}
                className={cn(PRISM.glideSurface, shouldPreventTouchScroll && "touch-none", className)}
                {...props}
                {...menuHandlers}
            >
                <GlideHighlight rect={rect} visible={visible} className={highlightClassName} />
                <div className={cn("relative z-[2]", contentClassName)}>
                    {children}
                </div>
            </div>
        )
    },
)

export const PrismGlideMenuItem = React.forwardRef<HTMLButtonElement, PrismGlideMenuItemProps>(
    function PrismGlideMenuItem({
        children,
        className,
        glideId,
        id,
        type = "button",
        ...props
    }, ref) {
        const reactId = React.useId()
        const itemId = glideId ?? id ?? reactId

        return (
            <Button variant="ghost"
                ref={ref}
                id={id ?? itemId}
                type={type}
                data-glide-item={itemId}
                className={cn(
                    PRISM.item,
                    PRISM.glideItem,
                    PRISM.itemIcon,
                    className,
                )}
                {...props}
            >
                {children}
            </Button>
        )
    },
)
