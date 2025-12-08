import * as React from "react"

import { cn } from "@/lib/utils"



function Card({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card" className = {cn("flex flex-col justify-between | p-6 | bg-card border rounded-xl | text-card-foreground", className)}
            {...props}
        />
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-header" className = {cn("@container/card-header | flex flex-col items-start", className)}
            {...props}
        />
    )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-title" className = {cn("w-full | overflow-x-auto overflow-y-hidden", className)}
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
        <div data-slot = "card-content"
            {...props}
        />
    )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div data-slot = "card-footer" className = {cn("flex items-center", className)}
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
