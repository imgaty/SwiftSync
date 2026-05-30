//
//  form-dialog.tsx
//  Argent
//
//  Created by Codex on 30 May 2026.
//  Description: Provides register-style form presentation primitives for app flows that still need
//  dialog semantics but should not render with modal card chrome.
//
"use client"

import * as React from "react"

import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type FormDialogContentProps = React.ComponentProps<typeof DialogContent> & {
    maxWidth?: string
}

export function FormDialogContent({
    className,
    children,
    maxWidth = "390px",
    showCloseButton = false,
    style,
    ...props
}: FormDialogContentProps) {
    return (
        <DialogContent
            variant="form"
            showCloseButton={showCloseButton}
            className={cn("animate-slide-in-right", className)}
            style={{ maxWidth: `min(${maxWidth}, calc(100vw - 2rem))`, ...style }}
            {...props}
        >
            {children}
        </DialogContent>
    )
}

type FormDialogHeaderProps = {
    title: React.ReactNode
    description?: React.ReactNode
    icon?: React.ReactNode
    className?: string
    titleClassName?: string
    descriptionClassName?: string
}

export function FormDialogHeader({
    title,
    description,
    icon,
    className,
    titleClassName,
    descriptionClassName,
}: FormDialogHeaderProps) {
    return (
        <DialogHeader className={cn("items-center gap-2 pb-2 text-center sm:text-center", className)}>
            {icon}
            <DialogTitle className={cn("text-[1.75rem] font-semibold leading-tight tracking-tight", titleClassName)}>
                {title}
            </DialogTitle>
            {description ? (
                <DialogDescription className={cn("max-w-sm text-sm leading-5 text-muted-foreground", descriptionClassName)}>
                    {description}
                </DialogDescription>
            ) : null}
        </DialogHeader>
    )
}

export function FormDialogBody({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return <div className={cn("flex flex-col gap-4", className)} {...props} />
}

export function FormDialogActions({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return <div className={cn("flex flex-col gap-4 pt-2", className)} {...props} />
}
