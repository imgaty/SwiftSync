//
//  primitives.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Primitives React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

// Settings page layout primitives shared across panels.
// Extracted from settings-dialog.tsx so other panels (rules, etc.) can use
// the same SectionHeader / SettingsSection / SettingRow without duplicating
// markup.

import * as React from "react"
import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"

export function SettingRow({
    label,
    description,
    children,
}: {
    label: React.ReactNode
    description: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4 py-1">
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[13px] font-medium leading-tight">{label}</p>
                <p className="text-xs text-neutral-400 leading-snug">{description}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

export function SectionHeader({
    title,
    description,
}: {
    title: React.ReactNode
    description: React.ReactNode
}) {
    return (
        <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="text-[13px] leading-relaxed text-neutral-400">{description}</p>
        </div>
    )
}

// A flat section: optional sub-heading + content. Place <SettingsDivider />
// between sections to separate them.
export function SettingsSection({
    title,
    description,
    children,
    className,
}: {
    title?: React.ReactNode
    description?: React.ReactNode
    children: React.ReactNode
    className?: string
}) {
    return (
        <section className={cn("space-y-3", className)}>
            {(title || description) && (
                <div className="space-y-0.5">
                    {title && <h4 className="text-[13px] font-semibold">{title}</h4>}
                    {description && <p className="text-xs text-neutral-400">{description}</p>}
                </div>
            )}
            {children}
        </section>
    )
}

export function SettingsDivider() {
    return <div className={cn(PRISM.separator, "my-5")} />
}
