//
//  layout.tsx
//  Argent
//
//  Created by Hilario Ferreira on 18 November 2025 at 14:49.
//  Description: Defines the root application layout for Argent, wiring metadata, providers, scripts, and
//  shared wrappers that every route inherits.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import { GeistMono } from "geist/font/mono"
import { LanguageProvider } from "@/components/language-provider"
import { CurrencyProvider } from "@/components/currency-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ColorBlindProvider } from "@/components/colorblind-provider"
import { AuthProvider } from "@/components/auth-provider"
import { QueryProvider } from "@/components/query-provider"
import { AppLoadingProvider } from "@/components/loading-provider"
import { SquircleProvider } from "@/components/squircle-provider"
import { SurfaceSpotlightProvider } from "@/components/surface-spotlight-provider"
import { getLanguageDefinition, normalizeLanguage } from "@/lib/languages"
import "./globals.css"

type ThemeCookie = "light" | "dark" | "system"

function isThemeCookie(value: string | undefined): value is ThemeCookie {
    return value === "light" || value === "dark" || value === "system"
}

export const metadata: Metadata = {
    title: "Argent",
    description: "Financial web app",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: [
            { url: "/icon-light.svg", type: "image/svg+xml", sizes: "any", media: "(prefers-color-scheme: light)" },
            { url: "/icon-dark.svg", type: "image/svg+xml", sizes: "any", media: "(prefers-color-scheme: dark)" },
            { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
            { url: "/favicon.ico", type: "image/x-icon", sizes: "any" },
        ],
        shortcut: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
        apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    },
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
}

export default async function RootLayout({
    children
}: Readonly<{ children: React.ReactNode; }>) {
    const languageCookie = normalizeLanguage((await cookies()).get("language")?.value)
    const languageDefinition = getLanguageDefinition(languageCookie)
    const colorblindCookie = (await cookies()).get("colorblind_mode")?.value as "deuteranopia" | "protanopia" | "tritanopia" | undefined
    const currencyCookie = (await cookies()).get("preferred_currency")?.value as "USD" | "GBP" | "BRL" | undefined
    const themeCookie = (await cookies()).get("theme")?.value
    const defaultTheme = isThemeCookie(themeCookie) ? themeCookie : "system"
    const initialThemeClass = defaultTheme === "light" || defaultTheme === "dark" ? defaultTheme : undefined
    const htmlClassName = [
        GeistMono.variable,
        initialThemeClass,
        colorblindCookie ? `colorblind-${colorblindCookie}` : undefined,
    ].filter(Boolean).join(" ")

    return (
        <html
            lang = {languageDefinition.htmlLang}
            dir = {languageDefinition.direction}
            data-language-direction = {languageDefinition.direction}
            data-language-layout = {languageDefinition.layout}
            className = {htmlClassName}
            suppressHydrationWarning
        >
            <body className = "font-sans antialiased">
                <ThemeProvider attribute = "class" defaultTheme = {defaultTheme} enableSystem storageKey = "theme" disableTransitionOnChange>
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
                <SquircleProvider />
                <SurfaceSpotlightProvider />
            </body>
        </html>
    )
}
