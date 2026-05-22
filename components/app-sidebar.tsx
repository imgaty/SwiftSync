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
import { getSidebarPageDefinitions } from "@/lib/sidebar-pages"
import { useSidebarPagePreferences } from "@/hooks/use-sidebar-page-preferences"

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
    }, [])

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
                        <CollapsedTooltip asChild size="lg" tooltip="Argent">
                            <Link href="/" aria-label="Argent">
                                <span className="flex min-w-0 flex-1 items-center justify-start group-data-[collapsible=icon]:hidden">
                                    <Image
                                        src="/full-icon-black.svg"
                                        alt="Argent"
                                        priority
                                        className="h-8 w-auto max-w-full dark:hidden"
                                    />
                                    <Image
                                        src="/full-icon-white.svg"
                                        alt=""
                                        priority
                                        aria-hidden
                                        className="hidden h-7 w-auto max-w-full dark:block"
                                    />
                                </span>
                                <span className="hidden aspect-square size-8 shrink-0 items-center justify-center text-sidebar-foreground group-data-[collapsible=icon]:flex">
                                    <Image
                                        src="/icon-black.svg"
                                        alt=""
                                        priority
                                        className="size-5 object-contain dark:hidden"
                                    />
                                    <Image
                                        src="/icon-white.svg"
                                        alt=""
                                        priority
                                        aria-hidden
                                        className="hidden size-5 object-contain dark:block"
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
