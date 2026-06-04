//
//  dialog.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Dialog UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"

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
                UDS.overlay,
                className,
            )}
            {...props}
        />
    )
}

function DialogContent({
    className,
    children,
    hideOverlay = false,
    overlayClassName,
    showCloseButton = true,
    variant = "default",
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    hideOverlay?: boolean
    overlayClassName?: string
    showCloseButton?: boolean
    variant?: "default" | "form"
}) {
    return (
        <DialogPortal>
            {!hideOverlay && <DialogOverlay className={overlayClassName} />}
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    "data-[state=open]:animate-in data-[state=closed]:animate-out",
                    "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                    "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                    "fixed left-1/2 top-[50dvh] -translate-x-1/2 -translate-y-1/2",
                    "flex flex-col gap-4",
                    variant === "default" && [
                        "z-[1000]",
                        "w-[min(calc(100vw-2rem),440px)] max-h-[calc(100dvh-2rem)] overflow-y-auto",
                        UDS.containerClass({ padding: false }), "p-6 duration-200",
                        UDS.panelGlow,
                    ],
                    variant === "form" && [
                        "z-[1000]",
                        "w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto",
                        UDS.containerClass({ padding: false }), "p-6 duration-200",
                        UDS.panelGlow,
                    ],
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <DialogPrimitive.Close className={cn("absolute right-4 top-4", UDS.closeButton)}>
                        <X className="size-4" />
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
            UDS.title,
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
        className = {cn(UDS.description, className)}
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
