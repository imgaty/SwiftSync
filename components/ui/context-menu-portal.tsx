//
//  context-menu-portal.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Defines the reusable Context menu portal UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronRight } from "lucide-react"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PrismGlideMenu, PrismGlideMenuItem } from "@/components/ui/glide-highlight"

/* ─── Constants ────────────────────────────────────────────────────── */
const ANIM_OUT_MS = 120
const VIEWPORT_MARGIN = 16 // 1rem

const MENU_ITEM_DESTRUCTIVE = [
    PRISM.item,
    PRISM.glideItem,
    PRISM.itemIcon,
    "text-red-400",
    "hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400",
    "data-[active=true]:bg-red-500/10 data-[active=true]:text-red-500 dark:data-[active=true]:text-red-400",
    "focus-visible:ring-red-400/35",
    "w-full cursor-pointer text-left",
    "[&>span:first-of-type]:flex-1 [&>span:first-of-type]:min-w-0 [&>span:first-of-type]:truncate",
].join(" ")

const MENU_ITEM_DEFAULT = cn(
    PRISM.item,
    PRISM.glideItem,
    PRISM.itemIcon,
    "min-h-11 w-full cursor-pointer text-left",
    "[&>span:first-of-type]:flex-1 [&>span:first-of-type]:min-w-0 [&>span:first-of-type]:truncate",
)

/* ─── Types ────────────────────────────────────────────────────────── */
export interface ContextMenuItem {
    label: string
    icon?: React.ReactNode
    shortcut?: string
    onClick: () => void
    separator?: boolean
    variant?: "default" | "destructive"
    disabled?: boolean
    sub?: ContextMenuItem[]
}

export interface ContextMenuSegment {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    disabled?: boolean
}

export interface ContextMenuSection {
    title?: string
    items: ContextMenuItem[]
}

export type ContextMenuItems = ContextMenuItem[] | ContextMenuSection[]

/* ─── Helpers ──────────────────────────────────────────────────────── */
function isSectionArray(items: ContextMenuItems): items is ContextMenuSection[] {
    return items.length > 0 && "items" in items[0]
}

function flattenToItems(input: ContextMenuItems): ContextMenuItem[] {
    if (!input.length) return []
    if (isSectionArray(input)) {
        const flat: ContextMenuItem[] = []
        input.forEach((section, si) => {
            if (si > 0 && flat.length > 0) {
                flat.push({ ...section.items[0], separator: true })
                flat.push(...section.items.slice(1))
            } else {
                flat.push(...section.items)
            }
        })
        return flat
    }
    return input as ContextMenuItem[]
}

/** Clamp a rect into the viewport with VIEWPORT_MARGIN on every edge. */
function clampToViewport(x: number, y: number, w: number, h: number, gap = 4) {
    let left = x + gap
    let top = y + gap

    if (left + w > window.innerWidth - VIEWPORT_MARGIN) {
        left = Math.max(VIEWPORT_MARGIN, x - w - gap)
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN
    if (left + w > window.innerWidth - VIEWPORT_MARGIN) left = window.innerWidth - VIEWPORT_MARGIN - w

    if (top + h > window.innerHeight - VIEWPORT_MARGIN) {
        top = Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN)
    }
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN

    return { left, top }
}

/* ─── ContextMenuPortal ────────────────────────────────────────────── */
export function ContextMenuPortal({
    x,
    y,
    onClose,
    items,
    segments,
    segmentLabel = "View options",
    anchor = "point",
}: {
    x: number
    y: number
    onClose: () => void
    items: ContextMenuItems
    segments?: ContextMenuSegment[]
    segmentLabel?: string
    anchor?: "point" | "bottom-right"
}) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ left: x + 4, top: y + 4 })
    const [closing, setClosing] = React.useState(false)
    const [activeId, setActiveId] = React.useState("")
    const closingRef = React.useRef(false)
    const onCloseRef = React.useRef(onClose)

    React.useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    const flatItems = React.useMemo(() => flattenToItems(items), [items])
    const menuEntries = React.useMemo(
        () => flatItems.map((item, index) => ({
            id: `context-menu-item-${index}`,
            item,
        })),
        [flatItems],
    )
    const segmentEntries = React.useMemo(
        () => (segments ?? []).map((segment, index) => ({
            id: `context-menu-segment-${index}`,
            segment,
        })),
        [segments],
    )
    const defaultActiveId = React.useMemo(
        () => menuEntries.find(({ item }) => !item.disabled)?.id
            ?? segmentEntries.find(({ segment }) => !segment.disabled)?.id
            ?? "",
        [menuEntries, segmentEntries],
    )
    const activationMap = React.useMemo(() => {
        const map = new Map<string, { disabled?: boolean; onClick: () => void }>()
        menuEntries.forEach(({ id, item }) => {
            if (!item.sub) map.set(id, item)
        })
        segmentEntries.forEach(({ id, segment }) => {
            map.set(id, segment)
        })
        return map
    }, [menuEntries, segmentEntries])

    /* Animate out, then unmount */
    const doClose = React.useCallback(() => {
        if (closingRef.current) return
        closingRef.current = true
        setClosing(true)
        // Fallback timeout in case onAnimationEnd doesn't fire
        setTimeout(() => onCloseRef.current(), ANIM_OUT_MS + 50)
    }, [])

    /* Clamp menu to viewport with 1rem margin — synchronous before paint */
    React.useLayoutEffect(() => {
        if (anchor === "bottom-right") return
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        setPosition(clampToViewport(x, y, rect.width, rect.height))
    }, [anchor, x, y])

    React.useEffect(() => {
        if (!defaultActiveId) return
        setActiveId(defaultActiveId)
    }, [defaultActiveId])

    React.useEffect(() => {
        ref.current?.focus({ preventScroll: true })
    }, [])

    const handleActivate = React.useCallback((id: string) => {
        const target = activationMap.get(id)
        if (!target || target.disabled) return

        target.onClick()
        doClose()
    }, [activationMap, doClose])

    /* Close on Escape, click-away, scroll, blur, resize */
    React.useEffect(() => {
        const esc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation()
                doClose()
            }
        }
        const clickAway = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                e.stopPropagation()
                doClose()
            }
        }

        document.addEventListener("mousedown", clickAway, true)
        document.addEventListener("keydown", esc)
        window.addEventListener("scroll", doClose, true)
        window.addEventListener("resize", doClose)
        window.addEventListener("blur", doClose)
        return () => {
            document.removeEventListener("mousedown", clickAway, true)
            document.removeEventListener("keydown", esc)
            window.removeEventListener("scroll", doClose, true)
            window.removeEventListener("resize", doClose)
            window.removeEventListener("blur", doClose)
        }
    }, [doClose])

    return createPortal(
        <PrismGlideMenu
            ref={ref}
            role="menu"
            aria-label="Context menu"
            className={cn(
                "fixed w-[220px] max-w-[calc(100vw-2rem)]",
                "rounded-[calc(var(--radius)+0.875rem)]",
                PRISM.container,
                closing ? PRISM.animateOut.replace('data-[state=closed]:', '') : PRISM.animateIn.replace('data-[state=open]:', ''),
            )}
            contentClassName="space-y-0.5"
            style={anchor === "bottom-right" ? {
                position: "fixed",
                right: "calc(env(safe-area-inset-right) + 1rem)",
                bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                pointerEvents: closing ? "none" : undefined,
            } : {
                position: "fixed",
                left: position.left,
                top: position.top,
                pointerEvents: closing ? "none" : undefined,
            }}
            defaultActiveId={defaultActiveId}
            activateOnPointerUp
            activateOnClick
            activateOnKeyDown
            onActiveIdChange={setActiveId}
            onActivate={handleActivate}
            onEscapeKeyDown={(event) => {
                event.stopPropagation()
                doClose()
            }}
            onAnimationEnd={() => { if (closingRef.current) onCloseRef.current() }}
        >
                {menuEntries.map(({ id, item }) => (
                    <React.Fragment key={id}>
                        {item.separator && <div className={PRISM.separator} />}
                        {item.sub ? (
                            <SubMenu item={item} glideId={id} active={activeId === id} onClose={doClose} />
                        ) : (
                            <PrismGlideMenuItem
                                role="menuitem"
                                glideId={id}
                                data-active={activeId === id}
                                tabIndex={activeId === id ? 0 : -1}
                                className={item.variant === "destructive" ? MENU_ITEM_DESTRUCTIVE : MENU_ITEM_DEFAULT}
                                disabled={item.disabled}
                            >
                                {item.icon ? <span className="flex shrink-0 items-center justify-center">{item.icon}</span> : null}
                                <span className="flex-1 min-w-0 truncate">{item.label}</span>
                                {item.shortcut ? <span className={PRISM.shortcut}>{item.shortcut}</span> : null}
                            </PrismGlideMenuItem>
                        )}
                    </React.Fragment>
                ))}
                {segmentEntries.length > 0 ? (
                    <>
                        <div className={PRISM.separator} />
                        <div
                            role="group"
                            aria-label={segmentLabel}
                            className={PRISM.glideSegmentGroup}
                            style={{ gridTemplateColumns: `repeat(${segmentEntries.length}, minmax(0, 1fr))` }}
                        >
                            {segmentEntries.map(({ id, segment }) => (
                                <Button variant="ghost"
                                    key={id}
                                    type="button"
                                    role="menuitem"
                                    data-glide-item={id}
                                    data-active={activeId === id}
                                    id={id}
                                    disabled={segment.disabled}
                                    tabIndex={activeId === id ? 0 : -1}
                                    className={PRISM.glideSegmentItem}
                                >
                                    {segment.icon ? <span className="flex shrink-0 items-center justify-center">{segment.icon}</span> : null}
                                    <span className="truncate">{segment.label}</span>
                                </Button>
                            ))}
                        </div>
                    </>
                ) : null}
            </PrismGlideMenu>,
        document.body,
    )
}

/* ─── SubMenu ──────────────────────────────────────────────────────── */
function SubMenu({
    item,
    glideId,
    active,
    onClose,
}: {
    item: ContextMenuItem
    glideId: string
    active: boolean
    onClose: () => void
}) {
    const [open, setOpen] = React.useState(false)
    const [closing, setClosing] = React.useState(false)
    const [activeId, setActiveId] = React.useState("")
    const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
    const [subPos, setSubPos] = React.useState<{ left: number; top: number }>({ left: 0, top: 0 })
    const triggerRef = React.useRef<HTMLDivElement>(null)
    const subRef = React.useRef<HTMLDivElement>(null)
    const subEntries = React.useMemo(
        () => (item.sub ?? []).map((subItem, index) => ({
            id: `${glideId}-sub-${index}`,
            item: subItem,
        })),
        [glideId, item.sub],
    )
    const defaultActiveId = React.useMemo(
        () => subEntries.find(({ item: subItem }) => !subItem.disabled)?.id ?? "",
        [subEntries],
    )
    const activationMap = React.useMemo(() => {
        const map = new Map<string, ContextMenuItem>()
        subEntries.forEach(({ id, item: subItem }) => {
            if (!subItem.sub) map.set(id, subItem)
        })
        return map
    }, [subEntries])

    const handleEnter = React.useCallback(() => {
        clearTimeout(closeTimer.current)
        setClosing(false)
        setOpen(true)
    }, [])

    const handleLeave = React.useCallback(() => {
        setClosing(true)
        closeTimer.current = setTimeout(() => {
            setOpen(false)
            setClosing(false)
        }, ANIM_OUT_MS)
    }, [])

    React.useEffect(() => () => clearTimeout(closeTimer.current), [])

    const visible = open

    React.useLayoutEffect(() => {
        if (!visible || !subRef.current || !triggerRef.current) return
        const sub = subRef.current
        const trigger = triggerRef.current
        const subRect = sub.getBoundingClientRect()
        const triggerRect = trigger.getBoundingClientRect()

        const fitsRight = triggerRect.right + subRect.width + 4 <= window.innerWidth - VIEWPORT_MARGIN
        const fitsLeft = triggerRect.left - subRect.width - 4 >= VIEWPORT_MARGIN

        let left: number
        if (fitsRight) {
            left = triggerRect.right + 4
        } else if (fitsLeft) {
            left = triggerRect.left - subRect.width - 4
        } else {
            left = triggerRect.right + 4
        }

        let top = triggerRect.top
        if (top + subRect.height > window.innerHeight - VIEWPORT_MARGIN) {
            top = window.innerHeight - VIEWPORT_MARGIN - subRect.height
        }
        if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN

        // Clamp left
        if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN
        if (left + subRect.width > window.innerWidth - VIEWPORT_MARGIN) {
            left = window.innerWidth - VIEWPORT_MARGIN - subRect.width
        }

        setSubPos({ left, top })
    }, [visible])

    return (
        <div ref={triggerRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <PrismGlideMenuItem
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                glideId={glideId}
                data-active={active}
                tabIndex={active ? 0 : -1}
                className={MENU_ITEM_DEFAULT}
                onPointerEnter={handleEnter}
                onPointerDown={(event) => {
                    if (event.pointerType !== "mouse") handleEnter()
                }}
                onFocus={handleEnter}
                onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleEnter()
                    }
                }}
            >
                {item.icon ? <span className="flex shrink-0 items-center justify-center">{item.icon}</span> : null}
                <span className="flex-1 min-w-0 truncate">{item.label}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5" />
            </PrismGlideMenuItem>
            {visible && item.sub && createPortal(
                <PrismGlideMenu
                    ref={subRef}
                    role="menu"
                    aria-label={`${item.label} submenu`}
                    className={cn("fixed w-[220px]", PRISM.container, closing ? PRISM.animateOut.replace('data-[state=closed]:', '') : PRISM.animateIn.replace('data-[state=open]:', ''))}
                    contentClassName="space-y-0.5"
                    style={{ position: "fixed", left: subPos.left, top: subPos.top, pointerEvents: closing ? "none" : undefined }}
                    defaultActiveId={defaultActiveId}
                    activateOnPointerUp
                    activateOnClick
                    activateOnKeyDown
                    onActiveIdChange={setActiveId}
                    onActivate={(id) => {
                        const subItem = activationMap.get(id)
                        if (!subItem || subItem.disabled) return

                        subItem.onClick()
                        onClose()
                    }}
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                >
                    {subEntries.map(({ id, item: subItem }) => (
                        <React.Fragment key={id}>
                            {subItem.separator && <div className={PRISM.separator} />}
                            {subItem.sub ? (
                                <SubMenu item={subItem} glideId={id} active={activeId === id} onClose={onClose} />
                            ) : (
                                <PrismGlideMenuItem
                                    role="menuitem"
                                    glideId={id}
                                    data-active={activeId === id}
                                    tabIndex={activeId === id ? 0 : -1}
                                    className={subItem.variant === "destructive" ? MENU_ITEM_DESTRUCTIVE : MENU_ITEM_DEFAULT}
                                    disabled={subItem.disabled}
                                >
                                    {subItem.icon ? <span className="flex shrink-0 items-center justify-center">{subItem.icon}</span> : null}
                                    <span className="flex-1 min-w-0 truncate">{subItem.label}</span>
                                    {subItem.shortcut ? <span className={PRISM.shortcut}>{subItem.shortcut}</span> : null}
                                </PrismGlideMenuItem>
                            )}
                        </React.Fragment>
                    ))}
                </PrismGlideMenu>,
                document.body,
            )}
        </div>
    )
}

/* ─── Hook for managing context menu state ─────────────────────────── */
export function useContextMenu() {
    const [state, setState] = React.useState<{ x: number; y: number } | null>(null)

    const open = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setState({ x: e.clientX, y: e.clientY })
    }, [])

    const close = React.useCallback(() => setState(null), [])

    return { state, open, close }
}
