//
//  button.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Button UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

const Base = cn(
    "inline-flex items-center justify-center gap-2 | whitespace-nowrap",
    "outline-none focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "text-[13px] font-semibold leading-tight",
    "cursor-pointer active:scale-[0.97] shrink-0",
    "transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.9]"
)

const buttonVariants = cva(Base, {
    variants: {
        variant: {
            // Filled button style
            solid: cn(
                UDS.primaryControl,
                "hover:text-primary dark:hover:text-primary-foreground",
            ),

            "solid-destructive": cn(
                "border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
                "shadow-[0_8px_24px_rgba(239,68,68,0.10),inset_0_0.5px_0_rgba(255,255,255,0.24)]",
                "hover:bg-red-500/15 hover:text-red-800 dark:hover:text-red-200",
            ),

            // Translucent glass style shared with the rest of the app's
            // UDS glass surfaces.
            glass: cn(
                UDS.cardSurface,
                UDS.cardHover,
                "text-foreground-secondary",
                "hover:text-foreground",
                "transition-colors",
            ),

            "glass-destructive": cn(
                UDS.destructiveAlert,
                "text-red-600 dark:text-red-400",

                "hover:bg-red-500/15 dark:hover:bg-red-400/15",
                "hover:border-red-500/30 dark:hover:border-red-400/30",
            ),

            // Transparent button style
            ghost: cn(
                "text-foreground",
                UDS.itemHover,
            ),

            "ghost-destructive": cn(
                "text-red-400",
                "hover:bg-red-500/10 dark:hover:bg-red-400/10",
                "hover:text-red-600 dark:hover:text-red-400",
            )
        },

        size: {
            default: "h-9 | px-4 py-2 | sq-xl",
            sm: "h-8 | px-3 gap-1.5 | sq-lg",
            lg: "h-12 | px-6 | sq-xl",
            icon: "size-7 | sq-full | scale-100 hover:scale-105",
            "icon-sm": "size-6 | sq-full | scale-100 hover:scale-105",
            "icon-lg": "size-8 | sq-full | scale-100 hover:scale-105",
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
