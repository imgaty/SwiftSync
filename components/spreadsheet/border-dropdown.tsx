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

function BorderStyleIcon({ style, className = "h-3 w-8" }: { style: BorderStyle; className?: string }) {
    const strokeW = style === "thick" ? 2.5 : style === "medium" ? 1.8 : 1
    const dashArray = style === "dashed" ? "4 3" : style === "dotted" ? "1.5 2" : "none"
    return (
        <svg viewBox="0 0 56 14" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="7" x2="56" y2="7" stroke="currentColor" strokeWidth={strokeW} strokeDasharray={dashArray} />
        </svg>
    )
}

/** Rotate `SquareDashedTopSolid` to indicate which edge is the solid line. */
function EdgeIcon({ side, className = "h-3.5 w-3.5" }: { side: "top" | "right" | "bottom" | "left"; className?: string }) {
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
        { label: "All", icon: <Grid3x3 className="h-4 w-4" />, type: "all" },
        { label: "Outer", icon: <Square className="h-4 w-4" />, type: "outer" },
        { label: "Top", icon: <EdgeIcon side="top" className="h-4 w-4" />, type: "top" },
        { label: "Right", icon: <EdgeIcon side="right" className="h-4 w-4" />, type: "right" },
        { label: "Bottom", icon: <EdgeIcon side="bottom" className="h-4 w-4" />, type: "bottom" },
        { label: "Left", icon: <EdgeIcon side="left" className="h-4 w-4" />, type: "left" },
        { label: "None", icon: <SquareDashed className="h-4 w-4" />, type: "none" },
    ]

    return (
        <Dropdown>
            <DropdownTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-lg gap-1 px-2 text-[11px]"
                    title="Borders"
                >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
            </DropdownTrigger>
            <DropdownContent width={320} align="start" className="p-2">
                <div className="mb-2 grid grid-cols-4 gap-1">
                    {placements.map((p) => (
                        <button
                            key={p.type}
                            type="button"
                            onClick={() => onApply(p.type, selectedStyle, selectedColor)}
                            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-transparent px-1 py-2 text-[10px] text-neutral-500 transition-colors hover:border-black/10 hover:bg-black/5 dark:hover:border-white/10 dark:hover:bg-white/5"
                            title={p.label}
                        >
                            {p.icon}
                            <span className="leading-none">{p.label}</span>
                        </button>
                    ))}
                </div>

                <DropdownSeparator />

                <div className="pt-2">
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Border style</div>
                    <div className="flex gap-1">
                    {BORDER_STYLES.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedStyle(s.value) }}
                            title={s.label}
                            className={cn(
                                "flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md border transition-colors",
                                selectedStyle === s.value
                                    ? "border-primary/40 bg-primary/15 text-primary"
                                    : "border-black/10 text-neutral-500 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5",
                            )}
                        >
                            <BorderStyleIcon style={s.value} />
                        </button>
                    ))}
                </div>

                    <div className="mt-3 mb-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Border color</div>
                    <div className="grid grid-cols-10 gap-1">
                        {COLOR_PRESETS.slice(0, 40).map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColor(c) }}
                                className={cn(
                                    "h-5 w-5 cursor-pointer rounded-sm border transition-transform hover:scale-105",
                                    selectedColor === c
                                        ? "border-primary ring-2 ring-primary/30"
                                        : "border-black/10 dark:border-white/10",
                                )}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                        <div className="h-5 w-5 rounded-sm border border-black/10 dark:border-white/10" style={{ backgroundColor: selectedColor }} />
                        <span className="font-mono text-[10px] text-neutral-500">{selectedColor.toUpperCase()}</span>
                        <input
                            type="color"
                            value={selectedColor}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="ml-auto h-6 w-8 cursor-pointer rounded border-0"
                        />
                    </div>
                </div>
            </DropdownContent>
        </Dropdown>
    )
}
