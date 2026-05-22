import { cookies } from "next/headers"
import { AppLoadingProvider } from "@/components/loading-provider";
import { CommandPalette } from "@/components/command-palette";
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { CanvasBackground } from "@/components/canvas-background"
import { SettingsRouter } from "@/components/settings-router"
import { AutoRecategorize } from "@/components/auto-recategorize"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()

    // Read all sidebar preferences from cookies (server-side to prevent hydration flash)
    const openCookie = cookieStore.get("sidebar_state")?.value
    const defaultOpen = openCookie ? openCookie === "true" : true
    const defaultSide = (cookieStore.get("sidebar_side")?.value as "left" | "right") || "left"
    // Width is stored in px
    const savedWidth = parseInt(cookieStore.get("sidebar_width")?.value || "240", 10)
    const defaultWidth = !isNaN(savedWidth) && savedWidth >= 200 && savedWidth <= 400 ? savedWidth : 240  // px

    return (
        <>
            <CommandPalette />
            <Toaster richColors closeButton position="bottom-right" />
            <AppLoadingProvider>
                <SidebarProvider defaultOpen={defaultOpen} defaultSide={defaultSide} defaultWidth={defaultWidth} showRail>
                    <AppSidebar />
                    <SidebarInset>
                        <CanvasBackground inset />
                        <div className="relative z-1 flex flex-col flex-1 min-h-0">
                            {children}
                        </div>
                    </SidebarInset>
                    <SettingsRouter />
                    <AutoRecategorize />
                </SidebarProvider>
            </AppLoadingProvider>
        </>
    );
}
