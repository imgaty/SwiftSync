import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/session"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

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
        select: { id: true, name: true, email: true, role: true, status: true },
    })

    if (!user || user.status !== "active") {
        redirect("/login?callbackUrl=/admin")
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
        redirect("/")
    }

    return (
        <>
            <Toaster richColors closeButton position="top-center" />
            <SidebarProvider defaultOpen={true}>
                <AdminSidebar user={user} />
                <SidebarInset>
                    <div className="flex flex-col flex-1 min-h-0">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    )
}
