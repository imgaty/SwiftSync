import * as React from "react"

import { cn } from "@/lib/utils"



function Card({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot="card" className={cn("flex flex-col justify-between gap-4 p-4 bg-card border rounded-xl text-card-foreground transition-all duration-200", className)}
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
