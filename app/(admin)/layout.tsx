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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { CanvasBackground } from "@/components/canvas-background"
import { sessionVersionMatches } from "@/lib/session"

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

    return (
        <>
            <Toaster richColors closeButton position="bottom-right" />
            <SidebarProvider defaultOpen={true}>
                <AdminSidebar user={user} />
                <SidebarInset>
                    <CanvasBackground inset />
                    <div className="relative z-1 flex flex-col flex-1 min-h-0">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    )
}
