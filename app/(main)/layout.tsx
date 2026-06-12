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
import { CommandPalette } from "@/components/command-palette";
import { AppSidebar } from "@/components/app-sidebar"
import { MobileDock } from "@/components/mobile-dock"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { SettingsRouter } from "@/components/settings-router"
import { AutoRecategorize } from "@/components/auto-recategorize"
import { getAuthContext } from "@/lib/auth-helpers"
import { hasImportedBankAccount } from "@/lib/onboarding"
import { getLanguageDefinition, isSidebarSide, normalizeLanguage } from "@/lib/languages"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const auth = await getAuthContext()
    if (!auth) redirect("/login")
    if (!(await hasImportedBankAccount(auth))) redirect("/connect-bank")

    const cookieStore = await cookies()
    const language = normalizeLanguage(cookieStore.get("language")?.value)
    const languageDefinition = getLanguageDefinition(language)

    // Read all sidebar preferences from cookies (server-side to prevent hydration flash)
    const openCookie = cookieStore.get("sidebar_state")?.value
    const defaultOpen = openCookie ? openCookie === "true" : true
    const sideCookie = cookieStore.get("sidebar_side")?.value
    const defaultSide = isSidebarSide(sideCookie) ? sideCookie : languageDefinition.sidebarSide
    // Width is stored in px
    const savedWidth = parseInt(cookieStore.get("sidebar_width")?.value || "240", 10)
    const defaultWidth = !isNaN(savedWidth) && savedWidth >= 200 && savedWidth <= 400 ? savedWidth : 240  // px

    return (
        <>
            <CommandPalette />
            <Toaster richColors closeButton position="bottom-right" />
            <SidebarProvider defaultOpen={defaultOpen} defaultSide={defaultSide} defaultWidth={defaultWidth} showRail>
                <AppSidebar />
                <SidebarInset>
                    <div className="relative z-1 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                        {children}
                    </div>
                </SidebarInset>
                <MobileDock />
                <SettingsRouter />
                <AutoRecategorize />
            </SidebarProvider>
        </>
    );
}
