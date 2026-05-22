"use client"

import { ContextMenuPortal, type ContextMenuItem } from "@/components/ui/context-menu-portal"

export function GridContextMenu({
    x,
    y,
    onClose,
    actions,
}: {
    x: number
    y: number
    onClose: () => void
    actions: { label: string; icon?: React.ReactNode; shortcut?: string; onClick: () => void; separator?: boolean; sub?: { label: string; icon?: React.ReactNode; onClick: () => void; separator?: boolean }[] }[]
}) {
    const items: ContextMenuItem[] = actions.map((a) => ({
        label: a.label,
        icon: a.icon,
        shortcut: a.shortcut,
        onClick: a.onClick,
        separator: a.separator,
        sub: a.sub?.map((s) => ({ label: s.label, icon: s.icon, onClick: s.onClick, separator: s.separator })),
    }))

    return <ContextMenuPortal x={x} y={y} onClose={onClose} items={items} />
}
