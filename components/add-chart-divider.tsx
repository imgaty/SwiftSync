//
//  add-chart-divider.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Add chart divider React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

// ==============================================================================
// ADD CHART DIVIDER COMPONENT
// ==============================================================================

interface AddChartDividerProps {
    onAdd: (index: number) => void
    index: number
    isEdge?: boolean
    edgeSide?: 'left' | 'right'  // Which side this edge divider is on
    vertical?: boolean
    disabled?: boolean
    tooltipLabel?: string
}

export const AddChartDivider = React.memo(function AddChartDivider({ 
    onAdd, 
    index, 
    isEdge = false,
    edgeSide,
    vertical = false, 
    disabled = false,
    tooltipLabel = "Add chart"
}: AddChartDividerProps) {
    const [isHovered, setIsHovered] = React.useState(false)
    const [isCenterHovered, setIsCenterHovered] = React.useState(false)
    
    const handleClick = React.useCallback(() => {
        if (!disabled) onAdd(index)
    }, [onAdd, index, disabled])

    if (vertical) {
        // Mobile: horizontal divider between stacked charts
        return (
            <div 
                className={`relative flex items-center justify-center w-full transition-all duration-200 ease-out ${isHovered ? 'h-8' : 'h-4'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setIsCenterHovered(false) }}
            >
                {/* Left half of line */}
                <div className={`absolute left-0 top-1/2 h-px transition-all duration-200 ease-out ${isHovered ? UDS.hairline : 'bg-transparent'} ${isCenterHovered ? 'right-[calc(50%+16px)]' : 'right-1/2'}`} />
                {/* Right half of line */}
                <div className={`absolute right-0 top-1/2 h-px transition-all duration-200 ease-out ${isHovered ? UDS.hairline : 'bg-transparent'} ${isCenterHovered ? 'left-[calc(50%+16px)]' : 'left-1/2'}`} />
                {/* Center line (connects the two halves when not hovering center) */}
                {!isCenterHovered && <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 h-px w-px transition-all duration-200 ${isHovered ? UDS.hairline : 'bg-transparent'}`} />}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost"
                            onClick={handleClick}
                            disabled={disabled}
                            onMouseEnter={() => setIsCenterHovered(true)}
                            onMouseLeave={() => setIsCenterHovered(false)}
                            className={cn(
                                "relative z-10 flex size-6 items-center justify-center sq-full transition-all duration-200",
                                disabled
                                    ? "cursor-not-allowed border border-transparent opacity-30"
                                    : isHovered
                                        ? cn("opacity-100 text-foreground-secondary hover:text-primary hover:scale-110", UDS.floatingPillSurface)
                                        : "border border-transparent opacity-0"
                            )}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" disabled={disabled}>
                        <p>{tooltipLabel}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        )
    }

    // Desktop: vertical divider between side-by-side charts
    // Normal dividers: 1rem width normally, 2rem on hover (affects layout)
    // Edge dividers: 0 width normally, expands to 1rem on hover (pushes adjacent charts)
    
    if (isEdge) {
        // Edge divider - 0 width normally, expands on hover to push adjacent containers
        return (
            <div 
                className="relative flex flex-col items-center justify-center self-stretch z-10"
                style={{ 
                    width: isHovered ? '32px' : '0px',
                    transition: 'width 200ms ease-out',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setIsCenterHovered(false) }}
            >
                {/* Invisible hitbox extending inward from edge when not hovered */}
                {!isHovered && (
                    <div 
                        className="absolute inset-y-0 w-4 z-30"
                        style={{ 
                            [edgeSide === 'left' ? 'right' : 'left']: 0,
                        }}
                    />
                )}
                {/* Top half of line */}
                <div className={`absolute top-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? UDS.hairlineStrong : 'bg-transparent'} ${isCenterHovered ? 'bottom-[calc(50%+16px)]' : 'bottom-1/2'}`} />
                {/* Bottom half of line */}
                <div className={`absolute bottom-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? UDS.hairlineStrong : 'bg-transparent'} ${isCenterHovered ? 'top-[calc(50%+16px)]' : 'top-1/2'}`} />
                {/* Center line */}
                {!isCenterHovered && <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-px h-px transition-all duration-200 ${isHovered ? UDS.hairlineStrong : 'bg-transparent'}`} />}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost"
                            onClick={handleClick}
                            disabled={disabled}
                            onMouseEnter={() => setIsCenterHovered(true)}
                            onMouseLeave={() => setIsCenterHovered(false)}
                            className={cn(
                                "absolute left-1/2 top-1/2 z-40 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center sq-full transition-all duration-200",
                                disabled
                                    ? "cursor-not-allowed border border-transparent opacity-30"
                                    : isHovered
                                        ? cn("opacity-100 text-foreground-secondary hover:text-primary hover:scale-110", UDS.floatingPillSurface)
                                        : "pointer-events-none border border-transparent opacity-0"
                            )}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side={edgeSide === 'left' ? 'right' : 'left'} disabled={disabled}>
                        <p>{tooltipLabel}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        )
    }
    
    // Normal divider - 1rem width, expands to 2rem on hover
    return (
        <div 
            className="relative flex flex-col items-center justify-center self-stretch z-10"
            style={{ 
                width: isHovered ? '32px' : '16px',
                transition: 'width 200ms ease-out',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsCenterHovered(false) }}
        >
            {/* Top half of line */}
            <div className={`absolute top-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? UDS.hairlineStrong : 'bg-transparent'} ${isCenterHovered ? 'bottom-[calc(50%+16px)]' : 'bottom-1/2'}`} />
            {/* Bottom half of line */}
            <div className={`absolute bottom-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? UDS.hairlineStrong : 'bg-transparent'} ${isCenterHovered ? 'top-[calc(50%+16px)]' : 'top-1/2'}`} />
            {/* Center line */}
            {!isCenterHovered && <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-px h-px transition-all duration-200 ${isHovered ? UDS.hairlineStrong : 'bg-transparent'}`} />}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost"
                        onClick={handleClick}
                        disabled={disabled}
                        onMouseEnter={() => setIsCenterHovered(true)}
                        onMouseLeave={() => setIsCenterHovered(false)}
                        className={cn(
                            "absolute left-1/2 top-1/2 z-40 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center sq-full transition-all duration-200",
                            disabled
                                ? "cursor-not-allowed border border-transparent opacity-30"
                                : isHovered
                                    ? cn("opacity-100 text-foreground-secondary hover:text-primary hover:scale-110", UDS.floatingPillSurface)
                                    : "pointer-events-none border border-transparent opacity-0"
                        )}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" disabled={disabled}>
                    <p>{tooltipLabel}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    )
})
