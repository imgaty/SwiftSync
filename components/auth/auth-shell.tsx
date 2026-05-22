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

export function AuthShell({ children, maxWidth = '350px' }: { children: ReactNode; maxWidth?: string }) {
    const { t, language, setLanguage } = useLanguage()
    const { resolvedTheme, setTheme } = useTheme()
    const mounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot)
    const isDark = mounted && resolvedTheme === 'dark'
    const nextTheme = isDark ? 'light' : 'dark'

    return (
        <div className="relative flex min-h-screen w-full flex-col">
            <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
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
                            variant="ghost"
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

            <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
                <div
                    className="relative z-10 flex w-full flex-col gap-4 animate-slide-in-right"
                    style={{ maxWidth }}
                >
                    <div className="flex items-center justify-center mb-8">
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
                <p className="text-xs text-neutral-400">
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
            <h1 className = "text-black dark:text-white | text-2xl font-bold">{page?.title}</h1>
            <p className = "text-neutral-400 | text-sm">{page?.[registerSubtitleKey ?? 'subtitle']}</p>
        </div>
    )
}
