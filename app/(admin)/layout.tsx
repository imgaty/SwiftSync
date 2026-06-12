//
//  layout.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the home route layout in Argent, providing shared structure, providers, and
//  navigation context for nested screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/session"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminMobileDock } from "@/components/admin/admin-mobile-dock"
import { CommandPalette } from "@/components/command-palette"
import { SettingsRouter } from "@/components/settings-router"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { sessionVersionMatches } from "@/lib/session"
import { getLanguageDefinition, isSidebarSide, normalizeLanguage } from "@/lib/languages"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // --- Role gate: only admin/superadmin can access ---
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth-token")?.value

    if (!authToken) {
        redirect("/login?callbackUrl=/admin")
    }

    const session = await verifySessionToken(authToken)
    if (!session) {
        redirect("/login?callbackUrl=/admin")
    }

    const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: { id: true, name: true, email: true, avatar: true, role: true, status: true, sessionVersion: true },
    })

    if (!user || user.status !== "active") {
        redirect("/login?callbackUrl=/admin")
    }
    if (!sessionVersionMatches(session, user.sessionVersion)) {
        redirect("/login?callbackUrl=/admin")
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
        redirect("/")
    }

    const openCookie = cookieStore.get("sidebar_state")?.value
    const defaultOpen = openCookie ? openCookie === "true" : true
    const language = normalizeLanguage(cookieStore.get("language")?.value)
    const languageDefinition = getLanguageDefinition(language)
    const sideCookie = cookieStore.get("sidebar_side")?.value
    const defaultSide = isSidebarSide(sideCookie) ? sideCookie : languageDefinition.sidebarSide
    const savedWidth = parseInt(cookieStore.get("sidebar_width")?.value || "240", 10)
    const defaultWidth = !isNaN(savedWidth) && savedWidth >= 200 && savedWidth <= 400 ? savedWidth : 240

    return (
        <>
            <CommandPalette />
            <Toaster richColors closeButton position="bottom-right" />
            <SidebarProvider defaultOpen={defaultOpen} defaultSide={defaultSide} defaultWidth={defaultWidth} showRail>
                <AdminSidebar user={user} />
                <SidebarInset>
                    <div className="relative z-1 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                        {children}
                    </div>
                </SidebarInset>
                <AdminMobileDock />
                <SettingsRouter />
            </SidebarProvider>
        </>
    )
}
