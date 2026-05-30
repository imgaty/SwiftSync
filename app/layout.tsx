//
//  layout.tsx
//  Argent
//
//  Created by Hilario Ferreira on 18 November 2025 at 14:49.
//  Description: Defines the root application layout for Argent, wiring metadata, providers, scripts, and
//  shared wrappers that every route inherits.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { LanguageProvider } from "@/components/language-provider"
import { CurrencyProvider } from "@/components/currency-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ColorBlindProvider } from "@/components/colorblind-provider"
import { AuthProvider } from "@/components/auth-provider"
import { QueryProvider } from "@/components/query-provider"
import { AppLoadingProvider } from "@/components/loading-provider"
import { SurfaceSpotlightProvider } from "@/components/surface-spotlight-provider"
import "./globals.css"

const themeInitScript = `
(() => {
    try {
        const storedTheme = window.localStorage.getItem("theme");
        const theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
            ? storedTheme
            : "system";
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolvedTheme);
        root.style.colorScheme = resolvedTheme;
    } catch {
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
    }
})();
`

export const metadata: Metadata = {
    title: "Argent",
    description: "Financial web app",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
            { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
        ],
        shortcut: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
        apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
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
            <head>
                <script
                    id="theme-init"
                    dangerouslySetInnerHTML={{ __html: themeInitScript }}
                />
            </head>
            <body className = "font-sans antialiased">
                <ThemeProvider attribute = "class" defaultTheme = "system" enableSystem storageKey = "theme" disableTransitionOnChange>
                    <ColorBlindProvider defaultMode = {colorblindCookie ?? "none"}>
                        <LanguageProvider defaultLanguage = {languageCookie}>
                            <CurrencyProvider defaultCurrency = {currencyCookie ?? "EUR"}>
                                <AuthProvider>
                                    <AppLoadingProvider>
                                        <QueryProvider>{children}</QueryProvider>
                                    </AppLoadingProvider>
                                </AuthProvider>
                            </CurrencyProvider>
                        </LanguageProvider>
                    </ColorBlindProvider>
                </ThemeProvider>
                <SurfaceSpotlightProvider />
            </body>
        </html>
    )
}
