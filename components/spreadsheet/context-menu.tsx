//
//  context-menu.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Context menu spreadsheet component for Argent, supporting workbook
//  editing controls, cell-level actions, and spreadsheet workspace interactions.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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
