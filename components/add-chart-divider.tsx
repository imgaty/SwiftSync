"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
                <div className={`absolute left-0 top-1/2 h-px transition-all duration-200 ease-out ${isHovered ? 'bg-border/40' : 'bg-transparent'} ${isCenterHovered ? 'right-[calc(50%+16px)]' : 'right-1/2'}`} />
                {/* Right half of line */}
                <div className={`absolute right-0 top-1/2 h-px transition-all duration-200 ease-out ${isHovered ? 'bg-border/40' : 'bg-transparent'} ${isCenterHovered ? 'left-[calc(50%+16px)]' : 'left-1/2'}`} />
                {/* Center line (connects the two halves when not hovering center) */}
                {!isCenterHovered && <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 h-px w-px transition-all duration-200 ${isHovered ? 'bg-border/40' : 'bg-transparent'}`} />}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleClick}
                            disabled={disabled}
                            onMouseEnter={() => setIsCenterHovered(true)}
                            onMouseLeave={() => setIsCenterHovered(false)}
                            className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200
                                ${disabled 
                                    ? 'opacity-30 cursor-not-allowed border-transparent' 
                                    : isHovered 
                                        ? 'opacity-100 border-border/50 bg-background text-muted-foreground hover:border-primary/50 hover:text-primary hover:scale-110' 
                                        : 'opacity-0 border-transparent'
                                }`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
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
                <div className={`absolute top-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? 'bg-border/50' : 'bg-transparent'} ${isCenterHovered ? 'bottom-[calc(50%+16px)]' : 'bottom-1/2'}`} />
                {/* Bottom half of line */}
                <div className={`absolute bottom-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? 'bg-border/50' : 'bg-transparent'} ${isCenterHovered ? 'top-[calc(50%+16px)]' : 'top-1/2'}`} />
                {/* Center line */}
                {!isCenterHovered && <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-px h-px transition-all duration-200 ${isHovered ? 'bg-border/50' : 'bg-transparent'}`} />}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={handleClick}
                            disabled={disabled}
                            onMouseEnter={() => setIsCenterHovered(true)}
                            onMouseLeave={() => setIsCenterHovered(false)}
                            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200
                                ${disabled 
                                    ? 'opacity-30 cursor-not-allowed border-transparent' 
                                    : isHovered 
                                        ? 'opacity-100 border-border/50 bg-background text-muted-foreground hover:border-primary/50 hover:text-primary hover:scale-110' 
                                        : 'opacity-0 border-transparent pointer-events-none'
                                }`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
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
            <div className={`absolute top-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? 'bg-border/50' : 'bg-transparent'} ${isCenterHovered ? 'bottom-[calc(50%+16px)]' : 'bottom-1/2'}`} />
            {/* Bottom half of line */}
            <div className={`absolute bottom-0 left-1/2 w-px -translate-x-1/2 transition-all duration-200 ease-out ${isHovered ? 'bg-border/50' : 'bg-transparent'} ${isCenterHovered ? 'top-[calc(50%+16px)]' : 'top-1/2'}`} />
            {/* Center line */}
            {!isCenterHovered && <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-px h-px transition-all duration-200 ${isHovered ? 'bg-border/50' : 'bg-transparent'}`} />}
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleClick}
                        disabled={disabled}
                        onMouseEnter={() => setIsCenterHovered(true)}
                        onMouseLeave={() => setIsCenterHovered(false)}
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200
                            ${disabled 
                                ? 'opacity-30 cursor-not-allowed border-transparent' 
                                : isHovered 
                                    ? 'opacity-100 border-border/50 bg-background text-muted-foreground hover:border-primary/50 hover:text-primary hover:scale-110' 
                                    : 'opacity-0 border-transparent pointer-events-none'
                            }`}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" disabled={disabled}>
                    <p>{tooltipLabel}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    )
})
