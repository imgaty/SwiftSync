//
//  form-dialog.tsx
//  Argent
//
//  Created by Codex on 30 May 2026.
//  Description: Provides register-style form presentation primitives inside Argent dialog surfaces.
//
"use client"

import * as React from "react"

import {
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { SelectTrigger } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"

type FormDialogContentProps = React.ComponentProps<typeof DialogContent> & {
    maxWidth?: string
    stableSize?: boolean
    height?: string
}

export function FormDialogContent({
    className,
    children,
    maxWidth = "390px",
    stableSize = false,
    height = "620px",
    overlayClassName,
    showCloseButton = true,
    style,
    ...props
}: FormDialogContentProps) {
    return (
        <DialogContent
            variant="form"
            overlayClassName={overlayClassName}
            showCloseButton={showCloseButton}
            className={cn(
                "animate-slide-in-right",
                stableSize && [
                    "h-[min(var(--form-dialog-height),calc(100dvh-2rem))] overflow-hidden",
                    "[&>form]:flex [&>form]:min-h-0 [&>form]:flex-1 [&>form]:flex-col",
                ],
                className,
            )}
            style={{
                maxWidth: `min(${maxWidth}, calc(100vw - 2rem))`,
                ...(stableSize ? { "--form-dialog-height": height } as React.CSSProperties : null),
                ...style,
            }}
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
        <DialogHeader className={cn("shrink-0 items-center gap-2 px-8 pb-2 text-center sm:text-center", className)}>
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
    return <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 animate-slide-in-right", className)} {...props} />
}

type FormSelectTriggerProps = React.ComponentProps<typeof SelectTrigger> & {
    label: React.ReactNode
}

export function FormSelectTrigger({
    className,
    label,
    children,
    ...props
}: FormSelectTriggerProps) {
    return (
        <SelectTrigger
            className={cn(
                "group/form-select relative h-14 w-full px-4 pt-4 text-left text-[15px] font-normal text-foreground",
                UDS.controlSurface,
                UDS.inputHover,
                UDS.inputFocus,
                UDS.itemOpen,
                "*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate *:data-[slot=select-value]:text-[15px] *:data-[slot=select-value]:text-foreground",
                className,
            )}
            {...props}
        >
            <span className="pointer-events-none absolute left-4 top-4 origin-left -translate-y-3 scale-[0.75] text-[15px] leading-none text-muted-foreground/80 transition-colors duration-200 group-data-[state=open]/form-select:text-blue-600/80 dark:group-data-[state=open]/form-select:text-blue-300/80">
                {label}
            </span>
            {children}
        </SelectTrigger>
    )
}

export function FormDialogActions({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return <div className={cn("flex shrink-0 flex-col gap-4 pt-2", className)} {...props} />
}

export function FormDialogStepIndicator({
    className,
    current,
    total,
}: {
    className?: string
    current: number
    total: number
}) {
    return (
        <div className={cn("flex shrink-0 items-center justify-center gap-1.5 pt-2", className)}>
            {Array.from({ length: total }, (_, i) => (
                <div
                    key={i}
                    className={cn(
                        "h-[5px] sq-full transition-all duration-300 ease-out",
                        i <= current ? "w-10 bg-primary" : cn("w-6", UDS.subtleFill),
                    )}
                />
            ))}
        </div>
    )
}
