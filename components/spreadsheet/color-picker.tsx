"use client"

import * as React from "react"
import { Dropdown, DropdownTrigger, DropdownContent } from "@/components/ui/dropdown"
import { COLOR_PRESETS } from "@/lib/spreadsheet-utils"

/**
 * Color picker dropdown. Renders the children as the trigger (Radix asChild)
 * — children must be a single ref-forwarding element (e.g. <button>, <Button>).
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
                    <button
                        type="button"
                        className="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1 text-[12px] hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={() => pick(automaticColor)}
                    >
                        <span
                            className="inline-block h-4 w-4 rounded-sm border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: automaticColor }}
                        />
                        {automaticLabel}
                    </button>
                )}

                <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Palette</div>
                <div className="grid grid-cols-10 gap-1">
                    {COLOR_PRESETS.slice(0, 40).map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={[
                                "h-5 w-5 cursor-pointer rounded-sm border transition-transform hover:scale-105",
                                selectedColor.toLowerCase() === c.toLowerCase()
                                    ? "border-primary ring-2 ring-primary/30"
                                    : "border-black/10 dark:border-white/10",
                            ].join(" ")}
                            style={{ backgroundColor: c }}
                            onClick={() => pick(c)}
                            title={c}
                        />
                    ))}
                </div>

                <div className="mt-2 flex items-center gap-2 rounded-md border border-black/10 bg-black/2 px-2 py-1.5 dark:border-white/10 dark:bg-white/2">
                    <span className="h-4 w-4 rounded-sm border border-black/10 dark:border-white/10" style={{ backgroundColor: selectedColor }} />
                    <span className="font-mono text-[10px] text-neutral-500">{selectedColor.toUpperCase()}</span>
                    <input
                        type="color"
                        value={customColor}
                        className="ml-auto h-6 w-8 cursor-pointer rounded border-0"
                        onChange={(e) => {
                            setCustomColor(e.target.value)
                            pick(e.target.value)
                        }}
                    />
                    <button
                        type="button"
                        className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-neutral-500 hover:bg-black/5 hover:text-neutral-800 dark:hover:bg-white/5 dark:hover:text-neutral-200"
                        onClick={() => pick("")}
                    >
                        No color
                    </button>
                </div>
            </DropdownContent>
        </Dropdown>
    )
}
