import { type ReactNode } from 'react'
import { SettingsPanel } from './settings-panel'
import { useLanguage } from '@/components/language-provider'

const YEAR = new Date().getFullYear()

export function AuthShell({ children, maxWidth = '350px' }: { children: ReactNode; maxWidth?: string }) {
    const { t } = useLanguage()

    return (
        <>
            <SettingsPanel />

            <div
                className = "relative z-10 flex flex-col gap-4 w-full animate-slide-in-right"
                style = {{ maxWidth }}
            >
                <div className = "flex items-center justify-center mb-8">
                    <span className = "text-black dark:text-white text-3xl font-bold tracking-tighter">
                        SwiftSync
                    </span>
                </div>
                {children}
            </div>

            <div className = "fixed bottom-0 pb-4 text-center animate-slide-in-right">
                <p className = "text-xs text-neutral-700 dark:text-neutral-400">
                    {t.auth_page?.footer?.replace('%{CURRENT_YEAR}', String(YEAR))}
                </p>
            </div>
        </>
    )
}

// Changing page selects a different translation key (e.g. login_page, register_page)
export function AuthHeader({ page: pageKey, registerSubtitleKey }: { page: string; registerSubtitleKey?: string }) {
    const { t } = useLanguage()
    const page = (t as Record<string, Record<string, string>>)[`${pageKey}_page`]

    return (
        <div className = "flex flex-col gap-2 | pb-4 | text-center">
            <h1 className = "text-black dark:text-white | text-2xl font-bold">{page?.title}</h1>
            <p className = "text-neutral-500 dark:text-neutral-400 | text-sm">{page?.[registerSubtitleKey ?? 'subtitle']}</p>
        </div>
    )
}