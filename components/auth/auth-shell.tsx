//
//  auth-shell.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Auth shell auth component for Argent, supporting sign-in, registration,
//  recovery, or security flows with reusable presentation logic.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import Image from 'next/image'
import { type ReactNode, useSyncExternalStore } from 'react'
import { Globe2, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import {
    Dropdown,
    DropdownContent,
    DropdownLanguageSection,
    DropdownTrigger,
} from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import { CanvasBackground } from '@/components/canvas-background'
import type { Language } from '@/lib/languages'
import { getTranslations } from '@/lib/translation-utils'

const YEAR = new Date().getFullYear()
const subscribeToMount = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function AuthShell({
    children,
    maxWidth = '350px',
    cornerHighlight = true,
}: {
    children: ReactNode
    maxWidth?: string
    cornerHighlight?: boolean
}) {
    const { t, language, setLanguage } = useLanguage()
    const { resolvedTheme, setTheme } = useTheme()
    const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot)
    const isDark = mounted && resolvedTheme === 'dark'
    const nextTheme = isDark ? 'light' : 'dark'
    const settingsCopy = getTranslations(t, 'settings')
    const commandCopy = getTranslations(t, 'command_palette')

    return (
        <div
            className="auth-shell relative isolate flex min-h-dvh w-full flex-col overflow-x-hidden overflow-y-auto bg-background text-foreground"
            data-corner-highlight={cornerHighlight ? 'on' : 'off'}
        >
            <CanvasBackground tone="auth" />
            <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={commandCopy.toggle_theme || 'Toggle theme'}
                    onClick={() => setTheme(nextTheme)}
                >
                    {isDark ? <Sun /> : <Moon />}
                </Button>

                <Dropdown>
                    <DropdownTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={settingsCopy.language || 'Change language'}
                        >
                            <Globe2 />
                        </Button>
                    </DropdownTrigger>

                    <DropdownContent
                        width={240}
                        className="max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
                    >
                        <DropdownLanguageSection
                            selectedLanguage={language}
                            onSelectLanguage={(value) => setLanguage(value as Language)}
                            title={settingsCopy.language || 'Language'}
                        />
                    </DropdownContent>
                </Dropdown>
            </div>

            <main className="auth-shell-main relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:py-20">
                <div
                    className="relative z-10 flex w-full flex-col gap-4 animate-slide-in-right"
                    style={{ maxWidth }}
                >
                    <div className="mb-6 flex items-center justify-center sm:mb-8">
                        <Image
                            src="/icon-black.svg"
                            alt="Argent"
                            width={122}
                            height={113}
                            priority
                            className="h-16 w-auto max-w-full object-contain dark:hidden"
                        />
                        <Image
                            src="/icon-white.svg"
                            alt=""
                            width={122}
                            height={113}
                            priority
                            aria-hidden
                            className="hidden h-16 w-auto max-w-full object-contain dark:block"
                        />
                    </div>

                    {children}
                </div>
            </main>

            <footer className="auth-shell-footer relative z-10 shrink-0 px-4 pt-1 text-center animate-slide-in-right">
                <p className="text-xs leading-5 text-muted-foreground">
                    {t.auth_page?.footer?.replace('%{CURRENT_YEAR}', String(YEAR))}
                </p>
            </footer>
        </div>
    )
}

// Changing page selects a different translation key (e.g. login_page, register_page)
export function AuthHeader({ page: pageKey, registerSubtitleKey }: { page: string; registerSubtitleKey?: string }) {
    const { t } = useLanguage()
    const page = (t as Record<string, Record<string, string>>)[`${pageKey}_page`]

    return (
        <div className = "flex flex-col gap-2 | pb-4 | text-center">
            <h1 className = "text-foreground | text-3xl font-bold leading-tight tracking-tight">{page?.title}</h1>
            <p className = "text-muted-foreground | text-sm leading-5">{page?.[registerSubtitleKey ?? 'subtitle']}</p>
        </div>
    )
}
