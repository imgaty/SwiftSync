//
//  border-dropdown.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Border dropdown spreadsheet component for Argent, supporting workbook
//  editing controls, cell-level actions, and spreadsheet workspace interactions.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import {
    ChevronDown,
    Grid3x3,
    Square,
    SquareDashedTopSolid,
    SquareDashed,
} from "lucide-react"
import {
    Dropdown,
    DropdownTrigger,
    DropdownContent,
    DropdownSeparator,
} from "@/components/ui/dropdown"
import { Button } from "@/components/ui/button"
import type { BorderStyle } from "@/lib/types"
import { BORDER_STYLES, COLOR_PRESETS } from "@/lib/spreadsheet-utils"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"

function BorderStyleIcon({ style, className = "h-3 w-8" }: { style: BorderStyle; className?: string }) {
    const strokeW = style === "thick" ? 2.5 : style === "medium" ? 1.8 : 1
    const dashArray = style === "dashed" ? "4 3" : style === "dotted" ? "1.5 2" : "none"
    return (
        <svg viewBox="0 0 56 14" className={className} data-line-icon fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="7" x2="56" y2="7" stroke="currentColor" strokeWidth={strokeW} strokeDasharray={dashArray} />
        </svg>
    )
}

/** Rotate `SquareDashedTopSolid` to indicate which edge is the solid line. */
function EdgeIcon({ side, className = "size-3.5" }: { side: "top" | "right" | "bottom" | "left"; className?: string }) {
    const rotation = side === "top" ? 0 : side === "right" ? 90 : side === "bottom" ? 180 : 270
    return (
        <SquareDashedTopSolid
            className={className}
            style={{ transform: `rotate(${rotation}deg)` }}
        />
    )
}

export function BorderDropdown({
    onApply,
    onMerge: _onMerge,
    onUnmerge: _onUnmerge,
}: {
    onApply: (
        type: "all" | "outer" | "none" | "top" | "bottom" | "left" | "right",
        style?: BorderStyle,
        color?: string,
    ) => void
    /** Kept for backwards compatibility; merge moved to alignment ribbon. */
    onMerge?: () => void
    onUnmerge?: () => void
}) {
    const [selectedStyle, setSelectedStyle] = React.useState<BorderStyle>("thin")
    const [selectedColor, setSelectedColor] = React.useState<string>("#000000")

    const placements: { label: string; icon: React.ReactNode; type: "all" | "outer" | "none" | "top" | "bottom" | "left" | "right" }[] = [
        { label: "All", icon: <Grid3x3 className="size-4" />, type: "all" },
        { label: "Outer", icon: <Square className="size-4" />, type: "outer" },
        { label: "Top", icon: <EdgeIcon side="top" className="size-4" />, type: "top" },
        { label: "Right", icon: <EdgeIcon side="right" className="size-4" />, type: "right" },
        { label: "Bottom", icon: <EdgeIcon side="bottom" className="size-4" />, type: "bottom" },
        { label: "Left", icon: <EdgeIcon side="left" className="size-4" />, type: "left" },
        { label: "None", icon: <SquareDashed className="size-4" />, type: "none" },
    ]

    return (
        <Dropdown>
            <DropdownTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 sq-lg gap-1 px-2 text-xs"
                    title="Borders"
                >
                    <Grid3x3 className="size-3.5" />
                    <ChevronDown className="size-3 opacity-70" />
                </Button>
            </DropdownTrigger>
            <DropdownContent width={320} align="start" className="p-2">
                <div className="mb-2 grid grid-cols-4 gap-1">
                    {placements.map((p) => (
                        <Button variant="ghost"
                            key={p.type}
                            type="button"
                            onClick={() => onApply(p.type, selectedStyle, selectedColor)}
                            className="flex cursor-pointer flex-col items-center justify-center gap-1 sq-md border border-transparent sq-border-muted px-1 py-2 text-xs text-neutral-500 transition-colors hover:text-foreground"
                            title={p.label}
                        >
                            {p.icon}
                            <span className="leading-none">{p.label}</span>
                        </Button>
                    ))}
                </div>

                <DropdownSeparator />

                <div className="pt-2">
                    <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">Border style</div>
                    <div className="flex gap-1">
                    {BORDER_STYLES.map((s) => (
                        <Button variant="ghost"
                            key={s.value}
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedStyle(s.value) }}
                            title={s.label}
                                className={cn(
                                    "flex h-8 flex-1 cursor-pointer items-center justify-center sq-md border transition-colors",
                                    selectedStyle === s.value
                                    ? cn(UDS.selectionSurface, UDS.selectedRing)
                                    : cn("sq-border-muted text-neutral-500", UDS.itemHover),
                            )}
                        >
                            <BorderStyleIcon style={s.value} />
                        </Button>
                    ))}
                </div>

                    <div className="mt-3 mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">Border color</div>
                    <div className="grid grid-cols-10 gap-1">
                        {COLOR_PRESETS.slice(0, 40).map((c) => (
                            <Button variant="ghost"
                                key={c}
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColor(c) }}
                                className={cn(
                                    "size-5 cursor-pointer sq-sm border transition-transform hover:scale-105",
	                                    selectedColor === c
	                                        ? UDS.selectedRing
	                                        : "sq-border-muted",
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                        <div className="size-5 sq-sm border sq-border-muted" style={{ backgroundColor: selectedColor }} />
                        <span className="font-mono text-xs text-neutral-500">{selectedColor.toUpperCase()}</span>
                        <input
                            type="color"
                            value={selectedColor}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="ml-auto h-6 w-8 cursor-pointer sq border-0"
                        />
                    </div>
                </div>
            </DropdownContent>
        </Dropdown>
    )
}
