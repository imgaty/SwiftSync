"use client"

import * as React from "react"

// ==============================================================================
// LANGUAGE REGISTRY
// ==============================================================================
// To add a new language:
// 1. Create a new file in /public/lang/ (e.g., "fr.json", "de.json", "es.json")
// 2. Add the language code to SUPPORTED_LANGUAGES below
// 3. Done! The language will be automatically available.

const SUPPORTED_LANGUAGES = ["en", "pt"] as const
const DEFAULT_LANGUAGE = "en"

type Language = typeof SUPPORTED_LANGUAGES[number]

// Type definition for translations - matches the JSON structure
interface Translations {
    config: {
        locale: string
        date_formats: Record<string, string>
        intl_formats: Record<string, Intl.DateTimeFormatOptions>
        first_day_of_week: number
        currency: string
        currency_symbol: string
        decimal_separator: string
        thousands_separator: string
    }
    sidebar_dashboard: string
    sidebar_calendar: string
    sidebar_goals: string
    sidebar: Record<string, string>
    chart_description: string
    loading: string
    errors: Record<string, { title: string; message: string }>
    auth_page: {
        footer?: string
    }
    oauth_buttons: {
        divider_label: string
        login_google: string
        register_google: string
        login_apple: string
        register_apple: string
        login_github: string
        register_github: string
        login_microsoft: string
        register_microsoft: string
    }
    login_page: {
        title: string
        subtitle: string
        email_label: string
        password_label: string
        forgot_password: string
        sign_in: string
        signing_in: string
        verify: string
        verifying: string
        use_different_account: string
        no_account: string
        create_one: string
        two_factor_title: string
        two_factor_subtitle: string
        two_factor_hint: string
        trust_device: string
        resend_code: string
        resending_code: string
        error_fields_required: string
        error_login_failed: string
        error_generic: string
        error_network: string
        error_2fa_required: string
        error_2fa_invalid: string
        error_no_account: string
        error_no_account_link: string
        error_wrong_password: string
        show_password: string
        hide_password: string
    }
    register_page: {
        title: string
        subtitle_email: string
        subtitle_details: string
        subtitle_password: string
        subtitle_security: string
    }
    forgot_password_page: {
        title: string
        subtitle: string
        email_label: string
        error_email_required: string
        error_generic: string
        error_network: string
        success_title: string
        success_message: string
        back_to_login: string
        sending: string
        send_reset_link: string
    }
    reset_password_page: {
        title: string
        subtitle: string
    }
    time_range: Record<string, string>
    data_type_labels: Record<string, string>
    navigation: Record<string, string>
    list_view_headers: Record<string, string>
    descriptions: Record<string, { label: string; format?: Intl.DateTimeFormatOptions }>
    chart_names: Record<string, string>
    chart_settings: Record<string, string>
    tooltips: Record<string, string>
    finance: {
        transactions: string
        budgets: string
        bills: string
        accounts: string
        overview: string
        overview_desc: string
        analytics: string
        analytics_desc: string
        financial_data: string
        financial_data_desc: string
        cash_flow: string
        cash_flow_desc: string
        pages: Record<string, string>
        table: Record<string, string>
        filters: Record<string, string>
        dialogs: Record<string, string>
    }
    command_palette: {
        placeholder: string
        no_results: string
        navigation: string
        go_to_dashboard: string
        go_to_transactions: string
        go_to_accounts: string
        go_to_budgets: string
        go_to_bills: string
        go_to_calendar: string
        go_to_goals: string
        theme: string
        light_mode: string
        dark_mode: string
        system_theme: string
        language: string
        switch_to_english: string
        switch_to_portuguese: string
    }
    [key: string]: unknown // Allow additional properties
}

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: Translations
    availableLanguages: readonly string[]
    isLoading: boolean
}

const LANGUAGE_COOKIE_NAME = "language"
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365  // 1 year

const LanguageContext = React.createContext<LanguageContextType | null>(null)

// Cache for loaded translations
const translationCache: Partial<Record<Language, Translations>> = {}

export function LanguageProvider({ 
    children,
    defaultLanguage = DEFAULT_LANGUAGE
}: { 
    children: React.ReactNode
    defaultLanguage?: Language
}) {
    const [language, setLanguageState] = React.useState<Language>(defaultLanguage)
    const [translations, setTranslations] = React.useState<Translations>({} as Translations)
    const [isLoading, setIsLoading] = React.useState(true)

    // Load translations for a language
    const loadTranslations = React.useCallback(async (lang: Language): Promise<Translations> => {
        // Return cached version if available
        if (translationCache[lang]) {
            return translationCache[lang]!
        }

        try {
            const response = await fetch(`/lang/${lang}.json`)
            if (!response.ok) {
                console.warn(`Failed to load translations for "${lang}", falling back to "${DEFAULT_LANGUAGE}"`)
                // Fallback to default language
                if (lang !== DEFAULT_LANGUAGE) {
                    return loadTranslations(DEFAULT_LANGUAGE)
                }
                return {} as Translations
            }
            
            const data = await response.json()
            translationCache[lang] = data
            return data as Translations
        } catch (error) {
            console.error(`Error loading translations for "${lang}":`, error)
            // Fallback to default language
            if (lang !== DEFAULT_LANGUAGE) {
                return loadTranslations(DEFAULT_LANGUAGE)
            }
            return {} as Translations
        }
    }, [])

    // Read cookie and load initial translations
    React.useEffect(() => {
        const initializeLanguage = async () => {
            setIsLoading(true)
            
            // Check for saved language preference in cookie
            let savedLanguage: Language = defaultLanguage
            const cookies = document.cookie.split(';')
            const langCookie = cookies.find(cookie => cookie.trim().startsWith(`${LANGUAGE_COOKIE_NAME}=`))
            
            if (langCookie) {
                const value = langCookie.split('=')[1]?.trim()
                if (SUPPORTED_LANGUAGES.includes(value as Language)) {
                    savedLanguage = value as Language
                }
            }

            setLanguageState(savedLanguage)
            const loadedTranslations = await loadTranslations(savedLanguage)
            setTranslations(loadedTranslations)
            setIsLoading(false)
        }

        initializeLanguage()
    }, [defaultLanguage, loadTranslations])

    // Change language and persist to cookie
    const setLanguage = React.useCallback(async (lang: Language) => {
        if (!SUPPORTED_LANGUAGES.includes(lang)) {
            console.warn(`Language "${lang}" is not supported. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`)
            return
        }

        setIsLoading(true)
        setLanguageState(lang)
        document.cookie = `${LANGUAGE_COOKIE_NAME}=${lang}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}`
        
        const loadedTranslations = await loadTranslations(lang)
        setTranslations(loadedTranslations)
        setIsLoading(false)
    }, [loadTranslations])

    const contextValue = React.useMemo(() => ({
        language,
        setLanguage,
        t: translations,
        availableLanguages: SUPPORTED_LANGUAGES,
        isLoading
    }), [language, setLanguage, translations, isLoading])

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = React.useContext(LanguageContext)

    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }

    return context
}

// Export for type safety when adding new languages
export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE }
export type { Language, Translations }
