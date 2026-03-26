import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SmartTooltipProvider } from "@/components/ui/tooltip"
import { ColorBlindProvider } from "@/components/colorblind-provider";
import { AutoScrollProvider } from "@/components/ui/overflow-scroll";
import { AuthProvider } from "@/components/auth-provider";
import { QueryProvider } from "@/components/query-provider";
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

    // Read language preference from cookie
    const defaultLanguage = (cookieStore.get("language")?.value as "en" | "pt") || "en"

    // Read colorblind mode from cookie
    const defaultColorBlindMode = (cookieStore.get("colorblind_mode")?.value as "none" | "deuteranopia" | "protanopia" | "tritanopia") || "none"

    return (
        <html lang={defaultLanguage} suppressHydrationWarning className={defaultColorBlindMode !== "none" ? `cb-${defaultColorBlindMode}` : undefined}>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var theme = localStorage.getItem('theme');
                                    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                        document.documentElement.classList.add('dark');
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    storageKey="theme"
                    disableTransitionOnChange
                >
                    <AutoScrollProvider>
                    <ColorBlindProvider defaultMode={defaultColorBlindMode}>
                    <SmartTooltipProvider>
                        <LanguageProvider defaultLanguage={defaultLanguage}>
                            <AuthProvider>
                                <QueryProvider>
                                    {children}
                                </QueryProvider>
                            </AuthProvider>
                        </LanguageProvider>
                    </SmartTooltipProvider>
                    </ColorBlindProvider>
                    </AutoScrollProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
