"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
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
    
    // Icon state: show dash during animation, otherwise X or check
    const iconState = animationPhase !== "idle" ? "dash" : (displayChecked ? "check" : "x")

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleClick}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed disabled:opacity-50",
                displayChecked ? "bg-primary" : "bg-muted",
                className
            )}
        >
            {/* Thumb */}
            <motion.div
                className="absolute flex items-center justify-center rounded-full bg-background shadow-sm"
                style={{ height: 18, top: 3 }}
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
            >
                {/* Icon */}
                <AnimatePresence mode="wait">
                    {iconState === "x" && (
                        <motion.svg
                            key="x"
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            className="text-muted-foreground"
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.1 }}
                        >
                            <path
                                d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </motion.svg>
                    )}
                    
                    {iconState === "dash" && (
                        <motion.svg
                            key="dash"
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            className="text-muted-foreground"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.05 }}
                        >
                            <path
                                d="M2.5 5H7.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </motion.svg>
                    )}
                    
                    {iconState === "check" && (
                        <motion.svg
                            key="check"
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            className="text-primary"
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.1 }}
                        >
                            <motion.path
                                d="M2 5.5L4 7.5L8 3"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        </motion.svg>
                    )}
                </AnimatePresence>
            </motion.div>
        </button>
    )
}
