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
import { useEffect, useState } from "react"

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

function ArgentMarkIcon({ className }: { className?: string }) {
    const maskId = React.useId()

    return (
        <svg
            aria-hidden
            focusable="false"
            viewBox="0 0 151 131"
            fill="none"
            className={className}
        >
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-5" y="-4" width="161" height="142">
                <path d="M151 0.273399H0V130.273H151V0.273399Z" fill="white" />
                <path d="M0 130.273L151 2.2734" stroke="black" strokeWidth="15" />
                <path d="M0 130.273L151 78.2734" stroke="black" strokeWidth="15" />
            </mask>
            <g mask={`url(#${maskId})`}>
                <path d="M0 130.273L75.214 0L150.428 130.273H0Z" fill="currentColor" />
            </g>
        </svg>
    )
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    dateOfBirth: string;
    initials: string;
    createdAt: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { t, language } = useLanguage()
    const { logout } = useAuth()
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)

    // Function to fetch user profile
    const fetchProfile = React.useCallback(async () => {
        try {
            const response = await fetch('/api/auth/profile', {
                cache: 'no-store',
                credentials: 'include',
                headers: {
                    'cache-control': 'no-cache',
                    pragma: 'no-cache',
                },
            })
            if (response.ok) {
                const data = await response.json()
                setUserProfile(data)
                return true
            } else if (response.status === 401) {
                await logout()
                return false
            } else {
                setUserProfile(null)
                return false
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error)
            setUserProfile(null)
            return false
        } finally {
            setIsLoadingUser(false)
        }
    }, [logout])

    const fetchProfileWithRetry = React.useCallback(async () => {
        setIsLoadingUser(true)
        const attempts = 3
        for (let attempt = 0; attempt < attempts; attempt++) {
            const ok = await fetchProfile()
            if (ok) return
            if (attempt < attempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, 350))
            }
        }
    }, [fetchProfile])

    // Fetch user profile on mount
    useEffect(() => {
        fetchProfileWithRetry()
    }, [fetchProfileWithRetry])

    // Listen for profile updates from settings dialog
    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchProfileWithRetry()
        }
        window.addEventListener('profile-updated', handleProfileUpdate)
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
        }
    }, [fetchProfileWithRetry])

    useEffect(() => {
        const onFocus = () => {
            fetchProfileWithRetry()
        }
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchProfileWithRetry()
            }
        }
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibilityChange)
        return () => {
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [fetchProfileWithRetry])

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
                        <CollapsedTooltip asChild size="lg" tooltip="Argent" className="group-data-[collapsible=icon]:p-2!">
                            <Link href="/" aria-label="Argent">
                                <span className="flex min-w-0 flex-1 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                                    <Image
                                        src="/full-icon-black.svg"
                                        alt=""
                                        width={632}
                                        height={167}
                                        priority
                                        aria-hidden
                                        draggable={false}
                                        className="h-8 w-[121px] max-w-full shrink-0 object-contain dark:invert"
                                    />
                                </span>
                                <span className="hidden shrink-0 items-center justify-start text-sidebar-foreground group-data-[collapsible=icon]:flex">
                                    <ArgentMarkIcon className="block size-4 shrink-0 text-current" />
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
