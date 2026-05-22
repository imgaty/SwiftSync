// Revised on 11 Apr 2026 - 17h04

import type { Metadata } from "next"
import { cookies } from "next/headers"
import { LanguageProvider } from "@/components/language-provider"
import { CurrencyProvider } from "@/components/currency-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ColorBlindProvider } from "@/components/colorblind-provider"
import { AutoScrollProvider } from "@/components/ui/overflow-scroll"
import { AuthProvider } from "@/components/auth-provider"
import { QueryProvider } from "@/components/query-provider"
import "./globals.css"

export const metadata: Metadata = {
    title: "Argent",
    description: "Financial web app",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [
            { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
            { url: "/icon-black.svg", type: "image/svg+xml", sizes: "any" },
            { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
        ],
        shortcut: [{ url: "/favicon.svg", type: "image/svg+xml", sizes: "any" }],
        apple: [{ url: "/icon-black.svg", type: "image/svg+xml", sizes: "any" }],
    },
}

export default async function RootLayout({
    children
}: Readonly<{ children: React.ReactNode; }>) {
    const languageCookie = (await cookies()).get("language")?.value === "pt" ? "pt" as const : "en" as const
    const colorblindCookie = (await cookies()).get("colorblind_mode")?.value as "deuteranopia" | "protanopia" | "tritanopia" | undefined
    const currencyCookie = (await cookies()).get("preferred_currency")?.value as "USD" | "GBP" | "BRL" | undefined

    return (
        <html lang = {languageCookie} className = {colorblindCookie ? `colorblind-${colorblindCookie}` : undefined} suppressHydrationWarning>
            <body className = "font-sans antialiased">
                <ThemeProvider attribute = "class" defaultTheme = "system" enableSystem storageKey = "theme" disableTransitionOnChange>
                    <ColorBlindProvider defaultMode = {colorblindCookie ?? "none"}>
                        <LanguageProvider defaultLanguage = {languageCookie}>
                            <CurrencyProvider defaultCurrency = {currencyCookie ?? "EUR"}>
                                <AuthProvider>
                                    <QueryProvider>{children}</QueryProvider>
                                </AuthProvider>
                            </CurrencyProvider>
                        </LanguageProvider>
                    </ColorBlindProvider>
                    <AutoScrollProvider />
                </ThemeProvider>
            </body>
        </html>
    )
}
