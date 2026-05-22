"use client"

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

interface AdminHeaderProps {
    title: string
    breadcrumbs?: { label: string; href?: string }[]
    actions?: React.ReactNode
}

export function AdminHeader({ title, breadcrumbs, actions }: AdminHeaderProps) {
    const { t } = useLanguage()
    const a = (t as any).admin || {} as Record<string, any>

    return (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

                {/* Breadcrumbs */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/admin">{a.admin_breadcrumb || "Admin"}</BreadcrumbLink>
                        </BreadcrumbItem>
                        {breadcrumbs?.map((crumb, i) => (
                            <span key={i} className="contents">
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    {crumb.href ? (
                                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                                    ) : (
                                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                    )}
                                </BreadcrumbItem>
                            </span>
                        )) ?? (
                            <>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{title}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        )}
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Right-side actions */}
                {actions && (
                    <div className="ml-auto flex items-center gap-2 *:rounded-full *:transition-transform *:duration-200 hover:*:scale-105 active:*:scale-95">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    )
}
