//
//  currency-provider.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Currency provider React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import currencyJs from "currency.js"
import { useLanguage } from "@/components/language-provider"

const BASE_CURRENCY = "EUR"
const DEFAULT_CURRENCY = "EUR"
const CURRENCY_COOKIE_NAME = "preferred_currency"
const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const RATES_CACHE_KEY = "argent:currency-rates"
const RATES_CACHE_TTL_MS = 1000 * 60 * 60 * 12

export const SUPPORTED_CURRENCIES = [
    { symbol: "€", code: "EUR" },
    { symbol: "$", code: "USD" },
    { symbol: "£", code: "GBP" },
    { symbol: "R$", code: "BRL" },
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]["code"]

const FALLBACK_RATES: Record<SupportedCurrency, number> = {
    EUR: 1,
    USD: 1.09,
    GBP: 0.86,
    BRL: 5.45,
}

interface FormatCurrencyOptions {
    fromCurrency?: string
    currency?: string
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
}

interface CurrencyContextValue {
    currency: SupportedCurrency
    setCurrency: (currency: SupportedCurrency) => void
    availableCurrencies: typeof SUPPORTED_CURRENCIES
    convertAmount: (amount: number, fromCurrency?: string, toCurrency?: string) => number
    formatCurrency: (amount: number, options?: FormatCurrencyOptions) => string
    isRatesLoading: boolean
}

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null)

function isSupportedCurrency(value: string): value is SupportedCurrency {
    return SUPPORTED_CURRENCIES.some((entry) => entry.code === value)
}

export function CurrencyProvider({
    children,
    defaultCurrency = DEFAULT_CURRENCY,
}: {
    children: React.ReactNode
    defaultCurrency?: SupportedCurrency
}) {
    const { t } = useLanguage()
    const locale = t.config?.locale || "en-US"
    const [currency, setCurrencyState] = React.useState<SupportedCurrency>(
        isSupportedCurrency(defaultCurrency) ? defaultCurrency : DEFAULT_CURRENCY
    )
    const [rates, setRates] = React.useState<Record<string, number>>(FALLBACK_RATES)
    const [isRatesLoading, setIsRatesLoading] = React.useState(false)
    const didLogRatesErrorRef = React.useRef(false)

    React.useEffect(() => {
        let cancelled = false

        const loadRates = async () => {
            setIsRatesLoading(true)

            const readCachedRates = () => {
                if (typeof window === "undefined") {
                    return null as { timestamp?: number; rates?: Record<string, number> } | null
                }

                const cached = window.localStorage.getItem(RATES_CACHE_KEY)
                if (!cached) return null

                try {
                    return JSON.parse(cached) as { timestamp?: number; rates?: Record<string, number> }
                } catch {
                    return null
                }
            }

            try {
                const cached = readCachedRates()
                if (cached?.timestamp && cached.rates && Date.now() - cached.timestamp < RATES_CACHE_TTL_MS) {
                    if (!cancelled) {
                        setRates({ ...FALLBACK_RATES, ...cached.rates })
                        setIsRatesLoading(false)
                    }
                    return
                }

                const response = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`, {
                    cache: "no-store",
                })
                if (!response.ok) {
                    throw new Error(`Failed to load exchange rates: ${response.status}`)
                }

                const data = await response.json() as { rates?: Record<string, number> }
                if (!data.rates) {
                    throw new Error("Rates payload missing")
                }

                const nextRates = { ...FALLBACK_RATES, ...data.rates }

                if (!cancelled) {
                    setRates(nextRates)
                }

                if (typeof window !== "undefined") {
                    window.localStorage.setItem(
                        RATES_CACHE_KEY,
                        JSON.stringify({ timestamp: Date.now(), rates: nextRates })
                    )
                }
            } catch (error) {
                const cached = readCachedRates()

                if (!didLogRatesErrorRef.current) {
                    console.warn("Falling back to cached/default exchange rates.", error)
                    didLogRatesErrorRef.current = true
                }

                if (!cancelled) {
                    if (cached?.rates) {
                        setRates({ ...FALLBACK_RATES, ...cached.rates })
                    } else {
                        setRates(FALLBACK_RATES)
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsRatesLoading(false)
                }
            }
        }

        loadRates()

        return () => {
            cancelled = true
        }
    }, [])

    const setCurrency = React.useCallback((nextCurrency: SupportedCurrency) => {
        if (!isSupportedCurrency(nextCurrency)) return
        setCurrencyState(nextCurrency)

        if (typeof document !== "undefined") {
            document.cookie = `${CURRENCY_COOKIE_NAME}=${nextCurrency}; path=/; max-age=${CURRENCY_COOKIE_MAX_AGE}`
        }
    }, [])

    const convertAmount = React.useCallback(
        (amount: number, fromCurrency: string = BASE_CURRENCY, toCurrency: string = currency) => {
            if (!Number.isFinite(amount)) return 0
            if (fromCurrency === toCurrency) return amount

            const normalizedFrom = fromCurrency.toUpperCase()
            const normalizedTo = toCurrency.toUpperCase()
            const fromRate = rates[normalizedFrom] ?? 1
            const toRate = rates[normalizedTo] ?? 1

            if (!fromRate || !toRate) return amount

            return currencyJs(amount, { precision: 6 }).divide(fromRate).multiply(toRate).value
        },
        [currency, rates]
    )

    const formatCurrency = React.useCallback(
        (amount: number, options?: FormatCurrencyOptions) => {
            const targetCurrency = (options?.currency || currency).toUpperCase()
            const converted = convertAmount(amount, options?.fromCurrency || BASE_CURRENCY, targetCurrency)

            return new Intl.NumberFormat(options?.locale || locale, {
                style: "currency",
                currency: targetCurrency,
                minimumFractionDigits: options?.minimumFractionDigits,
                maximumFractionDigits: options?.maximumFractionDigits,
            }).format(converted)
        },
        [convertAmount, currency, locale]
    )

    const value = React.useMemo<CurrencyContextValue>(() => ({
        currency,
        setCurrency,
        availableCurrencies: SUPPORTED_CURRENCIES,
        convertAmount,
        formatCurrency,
        isRatesLoading,
    }), [currency, setCurrency, convertAmount, formatCurrency, isRatesLoading])

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
    const context = React.useContext(CurrencyContext)
    if (!context) {
        throw new Error("useCurrency must be used within a CurrencyProvider")
    }
    return context
}
