import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "SwiftSync",
    description: "Financal web app",
};

import { cookies } from "next/headers"

export default async function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode; }>) {
    const cookieStore = await cookies()
    
    // Read all sidebar preferences from cookies (server-side to prevent hydration flash)
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
    const defaultSide = (cookieStore.get("sidebar_side")?.value as "left" | "right") || "left"
    // Width is stored in px
    const savedWidth = parseInt(cookieStore.get("sidebar_width")?.value || "240", 10)
    const defaultWidth = !isNaN(savedWidth) && savedWidth >= 200 && savedWidth <= 400 ? savedWidth : 240  // px

    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <LanguageProvider>
                    <SidebarProvider defaultOpen={defaultOpen} defaultSide={defaultSide} defaultWidth={defaultWidth} showRail>
                        <AppSidebar />
                        <SidebarInset>
                            {children}
                        </SidebarInset>
                    </SidebarProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
