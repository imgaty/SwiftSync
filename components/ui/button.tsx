// Revised: 14 Apr 2026 - 10h19

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const Base = cn(
    "inline-flex items-center justify-center gap-2 | whitespace-nowrap",
    "rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
    "text-[13px] font-semibold leading-tight",
    "cursor-pointer active:scale-[0.97] shrink-0",
    "transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0"
)

const buttonVariants = cva(Base, {
    variants: {
        variant: {
            // Filled button style
            solid: cn(
                "bg-black dark:bg-white",
                "text-white dark:text-black",
                "shadow-sm",

                "hover:bg-neutral-900 dark:hover:bg-neutral-100",
                "hover:shadow-md hover:shadow-black/10 dark:hover:shadow-white/5",
                "hover:brightness-110",
            ),

            "solid-destructive": cn(
                "bg-red-600 dark:bg-red-500",
                "text-white",
                "shadow-sm",

                "hover:bg-red-700 dark:hover:bg-red-600",
                "hover:shadow-md hover:shadow-red-500/20",
            ),

            // Translucent glass style — the lighter, more subtle button.
            // Used for secondary toolbar controls (Sort / Columns / etc.).
            // Tonally matches the SelectTrigger so the toolbar reads as one
            // family of inline controls.
            glass: cn(
                "bg-white/60 dark:bg-white/4",
                "border border-black/8 dark:border-white/10",
                "backdrop-blur-sm",
                "text-neutral-700 dark:text-neutral-300",

                "hover:bg-white/80 dark:hover:bg-white/7",
                "hover:border-black/12 dark:hover:border-white/14",
                "hover:text-neutral-900 dark:hover:text-white",
                "transition-colors",
            ),

            "glass-destructive": cn(
                "bg-red-500/10 dark:bg-red-400/10",
                "border border-red-500/20 dark:border-red-400/20",
                "backdrop-blur-xl backdrop-saturate-150",
                "shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_0.5px_0_rgba(255,255,255,0.06)]",
                "text-red-600 dark:text-red-400",

                "hover:bg-red-500/15 dark:hover:bg-red-400/15",
                "hover:border-red-500/30 dark:hover:border-red-400/30",
            ),

            // Transparent button style
            ghost: cn(
                "text-black dark:text-white",
                "hover:bg-black/[0.06] dark:hover:bg-white/[0.12]",
                "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
            ),

            "ghost-destructive": cn(
                "text-red-400",
                "hover:bg-red-500/10 dark:hover:bg-red-400/10",
                "hover:text-red-600 dark:hover:text-red-400",
            )
        },

        size: {
            default: "h-9 | px-4 py-2",
            sm: "h-8 | px-3 gap-1.5 | rounded-lg",
            lg: "h-12 | px-6 | rounded-xl",
            icon: "size-7 | rounded-full | scale-100 hover:scale-105",
            "icon-sm": "size-6 | rounded-full | scale-100 hover:scale-105",
            "icon-lg": "size-8 | rounded-full | scale-100 hover:scale-105",
        }
    },
    
    defaultVariants: {
        variant: "solid",
        size: "default",
    }
})

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }) {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            data-slot = "button"
            className = {cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
