//
//  admin-header.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Admin header admin component for Argent, supporting administrative
//  navigation, reporting, and management screens with shared UI structure.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import { Search } from "lucide-react"

import { openCommandPalette } from "@/components/command-palette"
import { NotificationButton } from "@/components/notification-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { useLanguage } from "@/components/language-provider"
import { UDS } from "@/lib/UDS"
import { getTranslations } from "@/lib/translation-utils"
import { cn } from "@/lib/utils"

interface AdminHeaderProps {
    title: string
    breadcrumbs?: { label: string; href?: string }[]
    actions?: React.ReactNode
}

export function AdminHeader({ title, breadcrumbs, actions }: AdminHeaderProps) {
    const { t } = useLanguage()
    const a = getTranslations(t, "admin")
    const trail = [
        { label: a.admin_breadcrumb || "Admin", href: "/admin" },
        ...(breadcrumbs?.length ? breadcrumbs : [{ label: title }]),
    ]

    return (
        <header className="animate-fade-in-down px-4 pt-4 lg:px-6 lg:pt-6" style={{ animationDuration: "0.2s" }}>
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger />

                <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />

                <Breadcrumb>
                    <BreadcrumbList>
                        {trail.map((crumb, index) => {
                            const isLast = index === trail.length - 1

                            return (
                                <span key={`${crumb.href ?? crumb.label}-${index}`} className="contents">
                                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                                    <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                                        {isLast || !crumb.href ? (
                                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink href={crumb.href} className="transition-colors hover:text-primary">
                                                {crumb.label}
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </span>
                            )
                        })}
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="ml-auto flex min-w-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={openCommandPalette}
                        className={cn(UDS.commandTriggerSurface, "hidden min-w-40 items-center gap-2 px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground lg:flex")}
                        aria-label="Open command palette"
                    >
                        <Search className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Search</span>
                        <kbd className="shrink-0 rounded-[5px] border border-border/70 px-1.5 py-0.5 font-mono text-xs leading-none text-muted-foreground">
                            Ctrl K
                        </kbd>
                    </button>
                    {actions && (
                        <>
                            <div className="flex min-w-0 items-center gap-2">
                                {actions}
                            </div>
                            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                        </>
                    )}
                    <NotificationButton />
                    <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}
