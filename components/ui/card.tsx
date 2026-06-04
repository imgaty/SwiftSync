//
//  card.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Card UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import * as React from "react"

import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"



function Card({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot="card" className={cn(UDS.cardSurface, "spotlight-surface relative flex flex-col justify-between gap-4 p-4 text-card-foreground", className)}
            {...props}
        />
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-header" className = {cn("@container/card-header flex flex-col gap-1", className)}
            {...props}
        />
    )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-title" className = {cn("w-full overflow-x-auto overflow-y-hidden font-semibold", className)}
            {...props}
        />
    )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-description" className = {cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-action" className = {cn("self-start justify-self-end", className)}
            {...props}
        />
    )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-content" className = {cn("", className)}
            {...props}
        />
    )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-footer" className = {cn("flex items-center gap-4", className)}
            {...props}
        />
    )
}

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardAction,
    CardDescription,
    CardContent,
}
