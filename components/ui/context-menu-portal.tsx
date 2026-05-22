"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronRight } from "lucide-react"
import { PRISM } from "@/lib/PRISM"
import { cn } from "@/lib/utils"

/* ─── Constants ────────────────────────────────────────────────────── */
const ANIM_OUT_MS = 120
const VIEWPORT_MARGIN = 16 // 1rem

const MENU_ITEM_DESTRUCTIVE = [
    PRISM.item,
    PRISM.itemIcon,
    "text-red-400",
    "hover:bg-red-500/10",
    "active:scale-[0.98] active:bg-red-500/[0.06]",
    "w-full cursor-pointer text-left",
    "[&>span:first-of-type]:flex-1 [&>span:first-of-type]:min-w-0 [&>span:first-of-type]:truncate",
].join(" ")

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
}: {
    x: number
    y: number
    onClose: () => void
    items: ContextMenuItems
}) {
    const ref = React.useRef<HTMLDivElement>(null)
    const [position, setPosition] = React.useState({ left: x + 4, top: y + 4 })
    const [closing, setClosing] = React.useState(false)
    const closingRef = React.useRef(false)
    const onCloseRef = React.useRef(onClose)
    onCloseRef.current = onClose

    const flatItems = React.useMemo(() => flattenToItems(items), [items])

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
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        setPosition(clampToViewport(x, y, rect.width, rect.height))
    }, [x, y])

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
        <div
            ref={ref}
            className={cn("fixed w-[220px]", PRISM.container, closing ? PRISM.animateOut.replace('data-[state=closed]:', '') : PRISM.animateIn.replace('data-[state=open]:', ''))}
            style={{ left: position.left, top: position.top, pointerEvents: closing ? "none" : undefined }}
            onAnimationEnd={() => { if (closingRef.current) onCloseRef.current() }}
        >
                {flatItems.map((item, i) => (
                    <React.Fragment key={i}>
                        {item.separator && <div className={PRISM.separator} />}
                        {item.sub ? (
                            <SubMenu item={item} onClose={doClose} />
                        ) : (
                            <button
                                className={item.variant === "destructive" ? MENU_ITEM_DESTRUCTIVE : `${PRISM.item} ${PRISM.itemHover} ${PRISM.itemIcon} active:scale-[0.98] active:bg-white/[0.06] w-full cursor-pointer text-left`}
                                disabled={item.disabled}
                                onClick={() => {
                                    if (item.disabled) return
                                    item.onClick()
                                    doClose()
                                }}
                            >
                                {item.icon ? <span className="flex shrink-0 items-center justify-center">{item.icon}</span> : null}
                                <span className="flex-1 min-w-0 truncate">{item.label}</span>
                                {item.shortcut ? <span className={PRISM.shortcut}>{item.shortcut}</span> : null}
                            </button>
                        )}
                    </React.Fragment>
                ))}
            </div>,
        document.body,
    )
}

/* ─── SubMenu ──────────────────────────────────────────────────────── */
function SubMenu({ item, onClose }: { item: ContextMenuItem; onClose: () => void }) {
    const [open, setOpen] = React.useState(false)
    const [closing, setClosing] = React.useState(false)
    const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
    const [subPos, setSubPos] = React.useState<{ left: number; top: number }>({ left: 0, top: 0 })
    const triggerRef = React.useRef<HTMLDivElement>(null)
    const subRef = React.useRef<HTMLDivElement>(null)

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
            <button className={`${PRISM.item} ${PRISM.itemHover} ${PRISM.itemIcon} active:scale-[0.98] active:bg-white/[0.06] w-full cursor-pointer text-left`}>
                {item.icon ? <span className="flex shrink-0 items-center justify-center">{item.icon}</span> : null}
                <span className="flex-1 min-w-0 truncate">{item.label}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5" />
            </button>
            {visible && item.sub && createPortal(
                <div
                    ref={subRef}
                    className={cn("fixed w-[220px]", PRISM.container, closing ? PRISM.animateOut.replace('data-[state=closed]:', '') : PRISM.animateIn.replace('data-[state=open]:', ''))}
                    style={{ left: subPos.left, top: subPos.top, pointerEvents: closing ? "none" : undefined }}
                    onMouseEnter={handleEnter}
                    onMouseLeave={handleLeave}
                >
                    {item.sub.map((subItem, i) => (
                        <React.Fragment key={i}>
                            {subItem.separator && <div className={PRISM.separator} />}
                            {subItem.sub ? (
                                <SubMenu item={subItem} onClose={onClose} />
                            ) : (
                                <button
                                    className={subItem.variant === "destructive" ? MENU_ITEM_DESTRUCTIVE : `${PRISM.item} ${PRISM.itemHover} ${PRISM.itemIcon} active:scale-[0.98] active:bg-white/[0.06] w-full cursor-pointer text-left`}
                                    disabled={subItem.disabled}
                                    onClick={() => {
                                        if (subItem.disabled) return
                                        subItem.onClick()
                                        onClose()
                                    }}
                                >
                                    {subItem.icon ? <span className="flex shrink-0 items-center justify-center">{subItem.icon}</span> : null}
                                    <span className="flex-1 min-w-0 truncate">{subItem.label}</span>
                                    {subItem.shortcut ? <span className={PRISM.shortcut}>{subItem.shortcut}</span> : null}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>,
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
