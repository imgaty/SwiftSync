//
//  animated-toggle.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Animated toggle UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedToggleProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

export function AnimatedToggle({ 
    checked, 
    onCheckedChange, 
    disabled = false,
    className 
}: AnimatedToggleProps) {
    const [isAnimating, setIsAnimating] = React.useState(false)
    const [displayChecked, setDisplayChecked] = React.useState(checked)
    const [animationPhase, setAnimationPhase] = React.useState<"idle" | "stretch" | "move">("idle")

    // Sync displayChecked with checked prop when not animating
    React.useEffect(() => {
        if (!isAnimating) {
            setDisplayChecked(checked)
        }
    }, [checked, isAnimating])

    const handleClick = () => {
        if (disabled || isAnimating) return
        
        const newValue = !checked
        setIsAnimating(true)
        setAnimationPhase("stretch")
        
        // Stretch phase - thumb expands
        setTimeout(() => {
            setAnimationPhase("move")
            setDisplayChecked(newValue)
        }, 100)
        
        // Complete and update actual value
        setTimeout(() => {
            onCheckedChange(newValue)
            setAnimationPhase("idle")
            setIsAnimating(false)
        }, 250)
    }

    // Track dimensions: 44px wide, 24px tall
    // Thumb: 18px normal, with 3px padding from edges
    // Positions: OFF = 3px, ON = 23px (44 - 18 - 3)
    
    const getThumbStyle = () => {
        const baseWidth = 18
        const stretchWidth = 22
        const trackPadding = 3
        const trackWidth = 44
        
        if (animationPhase === "stretch") {
            // Stretch toward the direction we're going
            return {
                width: stretchWidth,
                x: displayChecked 
                    ? trackWidth - baseWidth - trackPadding // Stay at ON, stretch left
                    : trackPadding, // Stay at OFF, stretch right
            }
        }
        
        if (animationPhase === "move") {
            // Move to new position, shrink back
            return {
                width: baseWidth,
                x: displayChecked 
                    ? trackWidth - baseWidth - trackPadding // Move to ON
                    : trackPadding, // Move to OFF
            }
        }
        
        // Idle state
        return {
            width: baseWidth,
            x: displayChecked 
                ? trackWidth - baseWidth - trackPadding 
                : trackPadding,
        }
    }

    const thumbStyle = getThumbStyle()

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleClick}
            data-state={displayChecked ? "checked" : "unchecked"}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center overflow-hidden border p-0 align-middle",
                "sq-full",
                "cursor-pointer outline-none transition-[background-color,border-color,box-shadow,opacity] duration-200 ease-out",
                "focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed disabled:opacity-45",
                displayChecked
                    ? cn(
                        "border-[color:color-mix(in_srgb,var(--foreground)_22%,transparent)]",
                        "bg-[color:color-mix(in_srgb,var(--foreground)_86%,var(--background))]",
                        "shadow-[0_6px_14px_rgba(8,8,8,0.10),inset_0_1px_0_rgba(255,255,255,0.20)]",
                        "dark:shadow-[0_7px_16px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.16)]",
                    )
                    : cn(
                        "border-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)]",
                        "bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
                        "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                    ),
                className
            )}
        >
            <motion.div
                className={cn(
                    "absolute top-[3px] flex items-center justify-center sq-full",
                    "border",
                    displayChecked
                        ? "border-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-background"
                        : "border-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[color:color-mix(in_srgb,var(--foreground)_54%,var(--background))]",
                    "shadow-[0_1px_2px_rgba(8,8,8,0.10),0_5px_12px_rgba(8,8,8,0.10)]",
                    "dark:shadow-[0_1px_2px_rgba(0,0,0,0.30),0_5px_12px_rgba(0,0,0,0.22)]",
                )}
                style={{ height: 18 }}
                initial={false}
                animate={{
                    x: thumbStyle.x,
                    width: thumbStyle.width,
                }}
                transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 35,
                }}
            />
        </button>
    )
}
