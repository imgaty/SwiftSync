export const LANGUAGE_CODES = [
    "en",
    "pt",
    "es",
    "fr",
    "de",
    "it",
    "nl",
    "pl",
    "sv",
    "tr",
    "vi",
    "id",
    "ar",
    "ru",
    "uk",
    "bg",
    "sr",
    "mk",
    "el",
    "zh",
    "zh-Hant",
    "ja",
    "ko",
] as const

export type Language = typeof LANGUAGE_CODES[number]
export type LanguageScript = "latin" | "arabic" | "cyrillic" | "greek" | "han" | "kana" | "hangul"
export type LanguageDirection = "ltr" | "rtl"
export type LanguageLayout = "standard" | "inverted"
export type SidebarSide = "left" | "right"

export interface LanguageDefinition {
    code: Language
    label: string
    nativeName: string
    locale: string
    htmlLang: string
    script: LanguageScript
    direction: LanguageDirection
    layout: LanguageLayout
    sidebarSide: SidebarSide
}

export const DEFAULT_LANGUAGE: Language = "en"

const LTR_INVERTED_LAYOUT = {
    direction: "ltr",
    layout: "inverted",
    sidebarSide: "right",
} as const satisfies Pick<LanguageDefinition, "direction" | "layout" | "sidebarSide">

const RTL_STANDARD_LAYOUT = {
    direction: "rtl",
    layout: "standard",
    sidebarSide: "left",
} as const satisfies Pick<LanguageDefinition, "direction" | "layout" | "sidebarSide">

export const LANGUAGE_DEFINITIONS: readonly LanguageDefinition[] = [
    { code: "en", label: "English", nativeName: "English", locale: "en-US", htmlLang: "en", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "pt", label: "Portuguese", nativeName: "Português", locale: "pt-PT", htmlLang: "pt", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "es", label: "Spanish", nativeName: "Español", locale: "es-ES", htmlLang: "es", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "fr", label: "French", nativeName: "Français", locale: "fr-FR", htmlLang: "fr", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "de", label: "German", nativeName: "Deutsch", locale: "de-DE", htmlLang: "de", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "it", label: "Italian", nativeName: "Italiano", locale: "it-IT", htmlLang: "it", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "nl", label: "Dutch", nativeName: "Nederlands", locale: "nl-NL", htmlLang: "nl", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "pl", label: "Polish", nativeName: "Polski", locale: "pl-PL", htmlLang: "pl", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "sv", label: "Swedish", nativeName: "Svenska", locale: "sv-SE", htmlLang: "sv", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "tr", label: "Turkish", nativeName: "Türkçe", locale: "tr-TR", htmlLang: "tr", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "vi", label: "Vietnamese", nativeName: "Tiếng Việt", locale: "vi-VN", htmlLang: "vi", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "id", label: "Indonesian", nativeName: "Bahasa Indonesia", locale: "id-ID", htmlLang: "id", script: "latin", ...LTR_INVERTED_LAYOUT },
    { code: "ar", label: "Arabic", nativeName: "العربية", locale: "ar-SA", htmlLang: "ar", script: "arabic", ...RTL_STANDARD_LAYOUT },
    { code: "ru", label: "Russian", nativeName: "Русский", locale: "ru-RU", htmlLang: "ru", script: "cyrillic", ...LTR_INVERTED_LAYOUT },
    { code: "uk", label: "Ukrainian", nativeName: "Українська", locale: "uk-UA", htmlLang: "uk", script: "cyrillic", ...LTR_INVERTED_LAYOUT },
    { code: "bg", label: "Bulgarian", nativeName: "Български", locale: "bg-BG", htmlLang: "bg", script: "cyrillic", ...LTR_INVERTED_LAYOUT },
    { code: "sr", label: "Serbian", nativeName: "Српски", locale: "sr-Cyrl-RS", htmlLang: "sr-Cyrl", script: "cyrillic", ...LTR_INVERTED_LAYOUT },
    { code: "mk", label: "Macedonian", nativeName: "Македонски", locale: "mk-MK", htmlLang: "mk", script: "cyrillic", ...LTR_INVERTED_LAYOUT },
    { code: "el", label: "Greek", nativeName: "Ελληνικά", locale: "el-GR", htmlLang: "el", script: "greek", ...LTR_INVERTED_LAYOUT },
    { code: "zh", label: "Chinese (Simplified)", nativeName: "简体中文", locale: "zh-CN", htmlLang: "zh-Hans", script: "han", ...LTR_INVERTED_LAYOUT },
    { code: "zh-Hant", label: "Chinese (Traditional)", nativeName: "繁體中文", locale: "zh-TW", htmlLang: "zh-Hant", script: "han", ...LTR_INVERTED_LAYOUT },
    { code: "ja", label: "Japanese", nativeName: "日本語", locale: "ja-JP", htmlLang: "ja", script: "kana", ...LTR_INVERTED_LAYOUT },
    { code: "ko", label: "Korean", nativeName: "한국어", locale: "ko-KR", htmlLang: "ko", script: "hangul", ...LTR_INVERTED_LAYOUT },
]

export const SUPPORTED_LANGUAGES = LANGUAGE_CODES

export const LANGUAGE_OPTIONS = LANGUAGE_DEFINITIONS.map((language) => ({
    value: language.code,
    label: language.nativeName,
}))

const LANGUAGE_BY_CODE = Object.fromEntries(
    LANGUAGE_DEFINITIONS.map((language) => [language.code, language]),
) as Record<Language, LanguageDefinition>

export function isSupportedLanguage(value: string | null | undefined): value is Language {
    return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

export function normalizeLanguage(value: string | null | undefined): Language {
    return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE
}

export function getLanguageDefinition(language: Language): LanguageDefinition {
    return LANGUAGE_BY_CODE[language]
}

export function isSidebarSide(value: string | null | undefined): value is SidebarSide {
    return value === "left" || value === "right"
}
