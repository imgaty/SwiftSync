// File reviewed on 06.04.2026 | 19:54


"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"

function Dialog({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot = "dialog" {...props} />
}

function DialogTrigger({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
    return <DialogPrimitive.Trigger data-slot = "dialog-trigger" {...props} />
}

function DialogPortal({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
    return <DialogPrimitive.Portal data-slot = "dialog-portal" {...props} />
}

function DialogClose({
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
    return <DialogPrimitive.Close data-slot = "dialog-close" {...props} />
}

// Page-behind dim+blur lives on the overlay so the entire viewport gets a
// frosted-glass treatment. The DialogContent still carries an inset highlight
// shadow for the glassy edge, but the heavy 200vmax dim is gone in favour of
// a real backdrop-filter overlay so the page actually blurs.
function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                "fixed inset-0 z-50",
                "bg-black/12 dark:bg-black/25 backdrop-blur-[3px]",
                className,
            )}
            {...props}
        />
    )
}

// Inset highlight only — the dim is now on the overlay, not the content.
const DIALOG_GLOW =
    "shadow-[0_10px_28px_rgba(0,0,0,0.14),inset_0_0.5px_0_rgba(255,255,255,0.34)] " +
    "dark:shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_0.5px_0_rgba(255,255,255,0.18)]"

function DialogContent({
    className,
    children,
    showCloseButton = true,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean
}) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                    "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                    "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                    "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                    "fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-50",
                    "w-[min(calc(100vw-2rem),440px)] max-h-[calc(100vh-2rem)] overflow-y-auto",
                    "flex flex-col gap-4",
                    PRISM.container, "p-6 duration-200",
                    DIALOG_GLOW,
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close className={cn("absolute right-4 top-4", PRISM.closeButton)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    )
}

function DialogHeader({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
        data-slot = "dialog-header"
        className={cn(
            "flex flex-col | space-y-1.5 | text-center sm:text-left",
            className
        )}
        {...props}
        />
    )
}

function DialogFooter({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
        data-slot = "dialog-footer"
        className = {cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
        />
    )
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
        data-slot = "dialog-title"
        className={cn(
            PRISM.title,
            className
        )}
        {...props}
        />
    )
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
        data-slot = "dialog-description"
        className = {cn(PRISM.description, className)}
        {...props}
        />
    )
}

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
}
