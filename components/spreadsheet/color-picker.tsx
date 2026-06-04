//
//  color-picker.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Color picker spreadsheet component for Argent, supporting workbook
//  editing controls, cell-level actions, and spreadsheet workspace interactions.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Dropdown, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown"
import { Button } from "@/components/ui/button"
import { COLOR_PRESETS } from "@/lib/spreadsheet-utils"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

/**
 * Color picker dropdown. Renders the children as the trigger (Radix asChild)
 * — children must be a single ref-forwarding element, usually the shared Button.
 * The picker uses Radix portal so it never gets clipped by overflow ancestors.
 */
export function ColorPickerPopover({
    children,
    onSelect,
    align = "start",
    width = 220,
    showAutomatic = false,
    automaticColor = "#000000",
    automaticLabel = "Automatic",
}: {
    children: React.ReactElement
    onSelect: (color: string) => void
    align?: "start" | "center" | "end"
    width?: number
    showAutomatic?: boolean
    automaticColor?: string
    automaticLabel?: string
}) {
    const [customColor, setCustomColor] = React.useState("#000000")
    const [selectedColor, setSelectedColor] = React.useState("#000000")

    const pick = React.useCallback((color: string) => {
        setSelectedColor(color || "#000000")
        onSelect(color)
    }, [onSelect])

    return (
        <Dropdown>
            <DropdownTrigger asChild>{children}</DropdownTrigger>
            <DropdownContent width={width} align={align} className="p-2.5">
                {showAutomatic && (
                    <Button variant="ghost"
                        type="button"
                        className={cn("mb-2 flex w-full items-center gap-2 sq-md px-2 py-1 text-[12px]", UDS.itemHover)}
                        onClick={() => pick(automaticColor)}
                    >
                        <span
                            className="inline-block size-4 sq-sm border sq-border-muted"
                            style={{ backgroundColor: automaticColor }}
                        />
                        {automaticLabel}
                    </Button>
                )}

                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Palette</div>
                <div className="grid grid-cols-10 gap-1">
                    {COLOR_PRESETS.slice(0, 40).map((c) => (
                        <Button variant="ghost"
                            key={c}
                            type="button"
                            className={[
                                "size-5 cursor-pointer sq-sm border transition-transform hover:scale-105",
	                                selectedColor.toLowerCase() === c.toLowerCase()
	                                    ? UDS.selectedRing
	                                    : "sq-border-muted",
                            ].join(" ")}
                            style={{ backgroundColor: c }}
                            onClick={() => pick(c)}
                            title={c}
                        />
                    ))}
                </div>

                <div className={`${UDS.inlineSurface} mt-2 flex items-center gap-2 px-2 py-1.5`}>
                    <span className="size-4 sq-sm border sq-border-muted" style={{ backgroundColor: selectedColor }} />
                    <span className="font-mono text-[10px] text-neutral-500">{selectedColor.toUpperCase()}</span>
                    <input
                        type="color"
                        value={customColor}
                        className="ml-auto h-6 w-8 cursor-pointer sq border-0"
                        onChange={(e) => {
                            setCustomColor(e.target.value)
                            pick(e.target.value)
                        }}
                    />
                    <Button variant="ghost"
                        type="button"
                        className={cn("cursor-pointer sq px-1.5 py-0.5 text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200", UDS.itemHover)}
                        onClick={() => pick("")}
                    >
                        No color
                    </Button>
                </div>
            </DropdownContent>
        </Dropdown>
    )
}
