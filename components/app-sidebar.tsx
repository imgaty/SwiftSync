//
//  app-sidebar.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Implements the App sidebar React component for Argent, encapsulating reusable interface
//  structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Image from "next/image"
import Link from "next/link"
import * as React from "react"

import { NavPages } from "@/components/nav-pages"
import { NavUser } from "@/components/nav-user"
import {
    CollapsedTooltip,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-provider"
import { getSidebarPageDefinitions } from "@/lib/sidebar-pages"
import { useSidebarPagePreferences } from "@/hooks/use-sidebar-page-preferences"
import { useUserProfile } from "@/hooks/use-user-profile"
import { AuthError } from "@/lib/query-keys"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { t, language } = useLanguage()
    const { logout } = useAuth()
    const { data: userProfile, isLoading: isLoadingUser, error, refetch } = useUserProfile()

    React.useEffect(() => {
        if (error instanceof AuthError) {
            void logout()
        }
    }, [error, logout])

    // Listen for profile updates from settings dialog
    React.useEffect(() => {
        const handleProfileUpdate = () => {
            void refetch()
        }
        window.addEventListener('profile-updated', handleProfileUpdate)
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
        }
    }, [refetch])

    // User data for NavUser
    const userData = {
        name: userProfile?.name || 'User',
        email: userProfile?.email || '',
        role: userProfile?.role || 'user',
        avatar: userProfile?.avatar || '',
    }

    const allPages = React.useMemo(() => getSidebarPageDefinitions(t, language), [t, language])
    const allPageIds = React.useMemo(() => allPages.map((page) => page.id), [allPages])
    const { orderedIds, hiddenSet, movePage, setHidden } = useSidebarPagePreferences(allPageIds)

    const pagesById = React.useMemo(
        () => new Map(allPages.map((page) => [page.id, page] as const)),
        [allPages]
    )

    const orderedPages = React.useMemo(
        () => orderedIds.map((id) => pagesById.get(id)).filter((page): page is NonNullable<typeof page> => Boolean(page)),
        [orderedIds, pagesById]
    )

    const visiblePages = React.useMemo(
        () => orderedPages.filter((page) => !hiddenSet.has(page.id)),
        [orderedPages, hiddenSet]
    )

    return (
        <Sidebar variant="inset" collapsible="icon" {...props}>
            <SidebarHeader className="px-2 pt-2 pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <CollapsedTooltip asChild size="lg" tooltip="Argent" className="group-data-[collapsible=icon]:p-1!">
                            <Link href="/" aria-label="Argent">
                                <span className="flex min-w-0 flex-1 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                                    <Image
                                        src="/full-icon-black.svg"
                                        alt=""
                                        width={369}
                                        height={104}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="h-8 w-[114px] max-w-full shrink-0 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/full-icon-white.svg"
                                        alt=""
                                        width={369}
                                        height={104}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="hidden h-8 w-[114px] max-w-full shrink-0 object-contain dark:block"
                                    />
                                </span>
                                <span className="hidden shrink-0 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:flex">
                                    <Image
                                        src="/icon-black.svg"
                                        alt=""
                                        width={84}
                                        height={78}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="block size-6 shrink-0 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/icon-white.svg"
                                        alt=""
                                        width={84}
                                        height={78}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="hidden size-6 shrink-0 object-contain dark:block"
                                    />
                                </span>
                            </Link>
                        </CollapsedTooltip>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-1">
                <NavPages
                    pages={visiblePages}
                    allPages={orderedPages}
                    onMovePage={movePage}
                    onTogglePageHidden={setHidden}
                />
                {/*<NavMain items={data.navMain} />*/}
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={userData} isLoading={isLoadingUser} />
            </SidebarFooter>

        </Sidebar>
    )
}
