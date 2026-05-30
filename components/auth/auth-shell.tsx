//
//  auth-shell.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Auth shell auth component for Argent, supporting sign-in, registration,
//  recovery, or security flows with reusable presentation logic.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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

const YEAR = new Date().getFullYear()
const subscribeToMount = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

type LanguageCode = 'en' | 'pt'

export function AuthShell({ children, maxWidth = '390px' }: { children: ReactNode; maxWidth?: string }) {
    const { t, language, setLanguage } = useLanguage()
    const { resolvedTheme, setTheme } = useTheme()
    const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot)
    const isDark = mounted && resolvedTheme === 'dark'
    const nextTheme = isDark ? 'light' : 'dark'

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background text-foreground">
            <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
                <Button
                    type="button"
                    variant="glass"
                    size="icon"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(nextTheme)}
                >
                    {isDark ? <Sun /> : <Moon />}
                </Button>

                <Dropdown>
                    <DropdownTrigger asChild>
                        <Button
                            type="button"
                            variant="glass"
                            size="icon"
                            aria-label="Change language"
                        >
                            <Globe2 />
                        </Button>
                    </DropdownTrigger>

                    <DropdownContent width={180}>
                        <DropdownLanguageSection
                            selectedLanguage={language}
                            onSelectLanguage={(value) => setLanguage(value as LanguageCode)}
                            showTitle
                        />
                    </DropdownContent>
                </Dropdown>
            </div>

            <main className="flex flex-1 items-center justify-center p-4 pt-24 sm:p-8">
                <div
                    className="relative z-10 flex w-full flex-col gap-4 animate-slide-in-right"
                    style={{ maxWidth: `min(${maxWidth}, calc(100vw - 2rem))` }}
                >
                    <div className="flex items-center justify-center mb-5">
                        <Image
                            src="/full-icon-black.svg"
                            alt="Argent"
                            width={632}
                            height={167}
                            priority
                            className="h-11 w-auto max-w-full object-contain dark:hidden"
                        />
                        <Image
                            src="/full-icon-white.svg"
                            alt=""
                            width={632}
                            height={167}
                            priority
                            aria-hidden
                            className="hidden h-11 w-auto max-w-full object-contain dark:block"
                        />
                    </div>
                    {children}
                </div>
            </main>

            <footer className="relative z-10 px-4 pb-4 pt-2 text-center animate-slide-in-right">
                <p className="text-xs text-muted-foreground">
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
            <h1 className = "text-foreground | text-[1.75rem] font-semibold leading-tight tracking-tight">{page?.title}</h1>
            <p className = "text-muted-foreground | text-sm leading-5">{page?.[registerSubtitleKey ?? 'subtitle']}</p>
        </div>
    )
}
