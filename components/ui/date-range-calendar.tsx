"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import { cn } from "@/lib/utils"

// ==============================================================================
// CONSTANTS
// ==============================================================================

const DATE_REGEX = {
    ISO: /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
    US: /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
    EU: /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
    MONTH_YEAR: /^([a-zA-Z]+)\s*(\d{4})$/,
    DAY_MONTH_YEAR: /^(\d{1,2})\s+([a-zA-Z]+)\s*,?\s*(\d{4})$/,
    MONTH_DAY_YEAR: /^([a-zA-Z]+)\s+(\d{1,2})\s*,?\s*(\d{4})$/,
    RELATIVE: /^(\d+)\s*(day|days|week|weeks|month|months|year|years)\s*ago$/i,
}

const DATE_FORMAT_OPTIONS = {
    SHORT: { day: 'numeric', month: 'short', year: 'numeric' } as const,
    SHORT_NO_YEAR: { day: 'numeric', month: 'short' } as const,
    MONTH_YEAR: { month: 'short', year: 'numeric' } as const,
    YEAR_ONLY: { year: 'numeric' } as const,
    MONTH_LONG: { month: 'long' } as const,
    DAY_ORDINAL: { day: 'numeric', month: 'long' } as const,
    WEEKDAY_SHORT: { weekday: 'short' } as const,
}

const MONTH_NAME_MAP: Record<string, number> = {
    'jan': 0, 'january': 0, 'janeiro': 0, 'ene': 0, 'enero': 0,
    'feb': 1, 'february': 1, 'fevereiro': 1, 'febrero': 1,
    'mar': 2, 'march': 2, 'março': 2, 'marzo': 2,
    'apr': 3, 'april': 3, 'abril': 3,
    'may': 4, 'maio': 4, 'mayo': 4,
    'jun': 5, 'june': 5, 'junho': 5, 'junio': 5,
    'jul': 6, 'july': 6, 'julho': 6, 'julio': 6,
    'aug': 7, 'august': 7, 'agosto': 7,
    'sep': 8, 'sept': 8, 'september': 8, 'setembro': 8, 'septiembre': 8,
    'oct': 9, 'october': 9, 'outubro': 9, 'octubre': 9,
    'nov': 10, 'november': 10, 'novembro': 10, 'noviembre': 10,
    'dec': 11, 'december': 11, 'dezembro': 11, 'diciembre': 11,
}

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth()

// ==============================================================================
// TYPES
// ==============================================================================

type ViewMode = 'days' | 'months' | 'years'

interface DateRangeCalendarLabels {
    start_date?: string
    end_date?: string
    day?: string
    days?: string
    apply?: string
    clear_range?: string
    day_view?: string
    month_view?: string
    year_view?: string
    jump_to_year?: string
}

interface DateRangeCalendarProps {
    /** Current custom date range (ISO date strings) */
    value?: { startDate: string | null; endDate: string | null } | null
    /** Called when user applies a range */
    onRangeChange: (range: { startDate: string; endDate: string }) => void
    /** Called when user clears the range */
    onClear: () => void
    /** Locale string for date formatting (e.g. "en", "pt") */
    locale?: string
    /** UI labels for i18n */
    labels?: DateRangeCalendarLabels
    /** Show the start/end date input panel on the left. @default false */
    showInputs?: boolean
    /** Additional class name for the root wrapper */
    className?: string
}

// ==============================================================================
// UTILITIES
// ==============================================================================

function parseNaturalDate(input: string, locale: string): Date | null {
    const trimmed = input.trim().toLowerCase()
    if (!trimmed) return null

    const today = new Date()

    if (trimmed === 'today' || trimmed === 'hoje' || trimmed === 'hoy') return today
    if (trimmed === 'yesterday' || trimmed === 'ontem' || trimmed === 'ayer') {
        const d = new Date(today)
        d.setDate(d.getDate() - 1)
        return d
    }

    const relativeMatch = trimmed.match(DATE_REGEX.RELATIVE)
    if (relativeMatch) {
        const [, num, unit] = relativeMatch
        const amount = parseInt(num)
        const d = new Date(today)
        if (unit.startsWith('day')) d.setDate(d.getDate() - amount)
        else if (unit.startsWith('week')) d.setDate(d.getDate() - amount * 7)
        else if (unit.startsWith('month')) d.setMonth(d.getMonth() - amount)
        else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() - amount)
        return d
    }

    const isoMatch = trimmed.match(DATE_REGEX.ISO)
    if (isoMatch) {
        const [, year, month, day] = isoMatch
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    const usMatch = trimmed.match(DATE_REGEX.US)
    if (usMatch) {
        const [, month, day, year] = usMatch
        if (parseInt(month) <= 12 && parseInt(day) <= 31) {
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
    }

    const monthDayYearMatch = trimmed.match(DATE_REGEX.MONTH_DAY_YEAR)
    if (monthDayYearMatch) {
        const [, monthStr, day, year] = monthDayYearMatch
        const monthIndex = MONTH_NAME_MAP[monthStr.toLowerCase()]
        if (monthIndex !== undefined) {
            return new Date(parseInt(year), monthIndex, parseInt(day))
        }
    }

    const dayMonthYearMatch = trimmed.match(DATE_REGEX.DAY_MONTH_YEAR)
    if (dayMonthYearMatch) {
        const [, day, monthStr, year] = dayMonthYearMatch
        const monthIndex = MONTH_NAME_MAP[monthStr.toLowerCase()]
        if (monthIndex !== undefined) {
            return new Date(parseInt(year), monthIndex, parseInt(day))
        }
    }

    const nativeDate = new Date(input)
    if (!isNaN(nativeDate.getTime())) return nativeDate

    return null
}

// ==============================================================================
// DATE RANGE CALENDAR COMPONENT
// ==============================================================================

const DateRangeCalendar = React.memo(React.forwardRef<HTMLDivElement, DateRangeCalendarProps>(
    function DateRangeCalendar(
        {
            value,
            onRangeChange,
            onClear,
            locale = "en",
            labels = {},
            showInputs = false,
            className,
        },
        ref
    ) {
        const todayDateString = React.useMemo(() => new Date().toDateString(), [])
        const todayEndOfDay = React.useMemo(() => {
            const d = new Date()
            d.setHours(23, 59, 59, 999)
            return d.getTime()
        }, [])

        const [viewMode, setViewMode] = React.useState<ViewMode>('days')
        const [viewDate, setViewDate] = React.useState(() => new Date())
        const [startDate, setStartDate] = React.useState<Date | null>(() =>
            value?.startDate ? new Date(value.startDate) : null
        )
        const [endDate, setEndDate] = React.useState<Date | null>(() =>
            value?.endDate ? new Date(value.endDate) : null
        )
        const [selectingEnd, setSelectingEnd] = React.useState(false)

        // Text input states (only used when showInputs=true)
        const [startInputValue, setStartInputValue] = React.useState(() =>
            value?.startDate
                ? new Date(value.startDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)
                : ''
        )
        const [endInputValue, setEndInputValue] = React.useState(() =>
            value?.endDate
                ? new Date(value.endDate).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT)
                : ''
        )

        // Drag state
        const [dragging, setDragging] = React.useState<'start' | 'end' | null>(null)
        const [dragOverDay, setDragOverDay] = React.useState<Date | null>(null)

        // Year jump input
        const [yearJumpInput, setYearJumpInput] = React.useState('')

        // ---- Calendar computations ----
        const firstDayOfMonth = React.useMemo(() =>
            new Date(viewDate.getFullYear(), viewDate.getMonth(), 1),
            [viewDate]
        )
        const lastDayOfMonth = React.useMemo(() =>
            new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0),
            [viewDate]
        )
        const startDay = React.useMemo(() => {
            const day = firstDayOfMonth.getDay()
            return day === 0 ? 6 : day - 1
        }, [firstDayOfMonth])

        const calendarDays = React.useMemo(() => {
            const days: (Date | null)[] = []
            const prevMonthLastDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate()
            for (let i = startDay - 1; i >= 0; i--) {
                days.push(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, prevMonthLastDay - i))
            }
            for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
                days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i))
            }
            const remainingDays = 42 - days.length
            for (let i = 1; i <= remainingDays; i++) {
                days.push(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, i))
            }
            return days
        }, [viewDate, startDay, lastDayOfMonth])

        const weekDays = React.useMemo(() => {
            const days: string[] = []
            const baseDate = new Date(2024, 0, 1)
            for (let i = 0; i < 7; i++) {
                const d = new Date(baseDate)
                d.setDate(d.getDate() + i)
                days.push(d.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.WEEKDAY_SHORT).slice(0, 2))
            }
            return days
        }, [locale])

        const months = React.useMemo(() =>
            Array.from({ length: 12 }, (_, i) => ({
                index: i,
                name: new Date(2024, i, 1).toLocaleDateString(locale, DATE_FORMAT_OPTIONS.MONTH_LONG)
            })),
            [locale]
        )

        const years = React.useMemo(() => {
            const startYear = Math.floor(viewDate.getFullYear() / 12) * 12
            return Array.from({ length: 12 }, (_, i) => startYear + i).filter(y => y <= CURRENT_YEAR)
        }, [viewDate])

        // ---- Date helpers ----
        const isOutsideMonth = React.useCallback((date: Date) =>
            date.getMonth() !== viewDate.getMonth(),
            [viewDate]
        )
        const isDisabled = React.useCallback((date: Date) =>
            date.getTime() > todayEndOfDay,
            [todayEndOfDay]
        )
        const isStartDate = React.useCallback((date: Date) =>
            startDate?.toDateString() === date.toDateString(),
            [startDate]
        )
        const isEndDate = React.useCallback((date: Date) =>
            endDate?.toDateString() === date.toDateString(),
            [endDate]
        )
        const isInRange = React.useCallback((date: Date) => {
            if (!startDate || !endDate) return false
            return date > startDate && date < endDate
        }, [startDate, endDate])
        const isToday = React.useCallback((date: Date) =>
            date.toDateString() === todayDateString,
            [todayDateString]
        )

        // Month helpers
        const isMonthDisabled = React.useCallback((monthIndex: number) => {
            if (viewDate.getFullYear() > CURRENT_YEAR) return true
            if (viewDate.getFullYear() === CURRENT_YEAR && monthIndex > CURRENT_MONTH) return true
            return false
        }, [viewDate])
        const isStartMonth = React.useCallback((monthIndex: number) => {
            if (!startDate) return false
            return startDate.getMonth() === monthIndex && startDate.getFullYear() === viewDate.getFullYear()
        }, [startDate, viewDate])
        const isEndMonth = React.useCallback((monthIndex: number) => {
            if (!endDate) return false
            return endDate.getMonth() === monthIndex && endDate.getFullYear() === viewDate.getFullYear()
        }, [endDate, viewDate])
        const isMonthInRange = React.useCallback((monthIndex: number) => {
            if (!startDate || !endDate) return false
            const checkDate = new Date(viewDate.getFullYear(), monthIndex, 15)
            return checkDate > startDate && checkDate < endDate
        }, [startDate, endDate, viewDate])

        // Year helpers
        const isYearDisabled = React.useCallback((year: number) => year > CURRENT_YEAR, [])
        const isStartYear = React.useCallback((year: number) => {
            if (!startDate) return false
            return startDate.getFullYear() === year
        }, [startDate])
        const isEndYear = React.useCallback((year: number) => {
            if (!endDate) return false
            return endDate.getFullYear() === year
        }, [endDate])
        const isYearInRange = React.useCallback((year: number) => {
            if (!startDate || !endDate) return false
            return year > startDate.getFullYear() && year < endDate.getFullYear()
        }, [startDate, endDate])

        // ---- Handlers ----
        const handleDayClick = React.useCallback((date: Date) => {
            if (isDisabled(date)) return

            if (!startDate || (startDate && endDate) || selectingEnd === false) {
                setStartDate(date)
                setEndDate(null)
                setSelectingEnd(true)
                setStartInputValue(date.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                setEndInputValue('')
                setViewDate(date)
            } else {
                if (date < startDate) {
                    setEndDate(startDate)
                    setStartDate(date)
                    setStartInputValue(date.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                    setEndInputValue(startDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                } else {
                    setEndDate(date)
                    setEndInputValue(date.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                }
                setSelectingEnd(false)
            }
        }, [startDate, endDate, selectingEnd, isDisabled, locale])

        const handleMonthClick = React.useCallback((monthIndex: number, selectWholeMonth = false) => {
            if (isMonthDisabled(monthIndex)) return

            if (selectWholeMonth) {
                const monthStart = new Date(viewDate.getFullYear(), monthIndex, 1)
                let monthEnd = new Date(viewDate.getFullYear(), monthIndex + 1, 0)
                if (monthEnd.getTime() > todayEndOfDay) monthEnd = new Date()

                setStartDate(monthStart)
                setEndDate(monthEnd)
                setStartInputValue(monthStart.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                setEndInputValue(monthEnd.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                setSelectingEnd(false)
                setViewMode('days')
                setViewDate(monthStart)
            } else {
                setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1))
                setViewMode('days')
            }
        }, [viewDate, isMonthDisabled, locale, todayEndOfDay])

        const handleYearClick = React.useCallback((year: number, selectWholeYear = false) => {
            if (isYearDisabled(year)) return

            if (selectWholeYear) {
                const yearStart = new Date(year, 0, 1)
                let yearEnd = new Date(year, 11, 31)
                if (yearEnd.getTime() > todayEndOfDay) yearEnd = new Date()

                setStartDate(yearStart)
                setEndDate(yearEnd)
                setStartInputValue(yearStart.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                setEndInputValue(yearEnd.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                setSelectingEnd(false)
                setViewMode('days')
                setViewDate(yearStart)
            } else {
                setViewDate(new Date(year, viewDate.getMonth(), 1))
                setViewMode('months')
            }
        }, [viewDate, isYearDisabled, locale, todayEndOfDay])

        const handleYearJump = React.useCallback((input: string) => {
            const year = parseInt(input)
            if (!isNaN(year) && year >= 1900 && year <= CURRENT_YEAR) {
                setViewDate(new Date(year, viewDate.getMonth(), 1))
                setYearJumpInput('')
            }
        }, [viewDate])

        // Text input handlers
        const handleStartInputChange = React.useCallback((val: string) => {
            setStartInputValue(val)
            const parsed = parseNaturalDate(val, locale)
            if (parsed && parsed.getTime() <= todayEndOfDay) {
                setStartDate(parsed)
                setViewDate(parsed)
                if (endDate && parsed > endDate) {
                    setEndDate(null)
                    setEndInputValue('')
                }
            }
        }, [endDate, locale, todayEndOfDay])

        const handleEndInputChange = React.useCallback((val: string) => {
            setEndInputValue(val)
            const parsed = parseNaturalDate(val, locale)
            if (parsed && parsed.getTime() <= todayEndOfDay && startDate) {
                if (parsed >= startDate) {
                    setEndDate(parsed)
                    setViewDate(parsed)
                }
            }
        }, [startDate, locale, todayEndOfDay])

        // Drag handlers
        const handleDragStart = React.useCallback((which: 'start' | 'end') => {
            setDragging(which)
        }, [])

        const handleDayMouseEnter = React.useCallback((day: Date) => {
            if (dragging && !isDisabled(day)) setDragOverDay(day)
        }, [dragging, isDisabled])

        React.useEffect(() => {
            if (!dragging) return
            const handleMouseUp = () => {
                if (dragOverDay) {
                    if (dragging === 'start') {
                        if (endDate && dragOverDay > endDate) {
                            setStartDate(endDate)
                            setEndDate(dragOverDay)
                            setStartInputValue(endDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                            setEndInputValue(dragOverDay.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                        } else {
                            setStartDate(dragOverDay)
                            setStartInputValue(dragOverDay.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                        }
                    } else if (dragging === 'end') {
                        if (startDate && dragOverDay < startDate) {
                            setEndDate(startDate)
                            setStartDate(dragOverDay)
                            setEndInputValue(startDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                            setStartInputValue(dragOverDay.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                        } else {
                            setEndDate(dragOverDay)
                            setEndInputValue(dragOverDay.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                        }
                    }
                }
                setDragging(null)
                setDragOverDay(null)
            }
            window.addEventListener('mouseup', handleMouseUp)
            return () => window.removeEventListener('mouseup', handleMouseUp)
        }, [dragging, dragOverDay, startDate, endDate, locale])

        // Apply / clear
        const handleApply = React.useCallback(() => {
            if (startDate && endDate) {
                onRangeChange({
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                })
            }
        }, [startDate, endDate, onRangeChange])

        const handleClear = React.useCallback(() => {
            setStartDate(null)
            setEndDate(null)
            setStartInputValue('')
            setEndInputValue('')
            setSelectingEnd(false)
            onClear()
        }, [onClear])

        const daysDiff = React.useMemo(() => {
            if (!startDate || !endDate) return null
            return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        }, [startDate, endDate])

        // ---- Render ----
        return (
            <div
                ref={ref}
                className={cn(
                    "bg-background rounded-xl overflow-hidden",
                    showInputs ? "w-[560px]" : "w-[360px]",
                    className
                )}
            >
                <div className="flex">
                    {/* Left panel — start / end inputs (optional) */}
                    {showInputs && (
                        <div className="w-[200px] flex flex-col border-r border-black/8 dark:border-white/8">
                            <div className="p-3 flex-1">
                                {/* Start input */}
                                <div
                                    onClick={() => setSelectingEnd(false)}
                                    className={cn(
                                        "group px-3 py-2 rounded-xl transition-all duration-200 mb-2",
                                        !selectingEnd
                                            ? "bg-black/5 dark:bg-white/5 ring-2 ring-blue-500/50 dark:ring-blue-500/30 shadow-sm"
                                            : "bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                                    )}
                                >
                                    <div className={cn(
                                        "text-[10px] uppercase tracking-wider font-semibold mb-1 transition-colors",
                                        !selectingEnd ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                                    )}>
                                        {labels.start_date ?? "Start"}
                                    </div>
                                    <input
                                        type="text"
                                        value={startInputValue}
                                        onChange={(e) => handleStartInputChange(e.target.value)}
                                        onFocus={() => setSelectingEnd(false)}
                                        onBlur={() => {
                                            if (startDate) setStartInputValue(startDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                                        }}
                                        placeholder="e.g. Dec 25, 2024"
                                        className={cn(
                                            "w-full bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
                                            startDate
                                                ? (!selectingEnd ? "text-neutral-900 dark:text-white" : "text-neutral-900 dark:text-white")
                                                : "text-neutral-500 dark:text-neutral-400"
                                        )}
                                    />
                                </div>

                                {/* End input */}
                                <div
                                    onClick={() => startDate && setSelectingEnd(true)}
                                    className={cn(
                                        "group px-3 py-2 rounded-xl transition-all duration-200",
                                        !startDate && "opacity-40 cursor-not-allowed",
                                        selectingEnd
                                            ? "bg-black/5 dark:bg-white/5 ring-2 ring-blue-500/50 dark:ring-blue-500/30 shadow-sm"
                                            : "bg-black/3 dark:bg-white/3 hover:bg-black/5 dark:hover:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                                    )}
                                >
                                    <div className={cn(
                                        "text-[10px] uppercase tracking-wider font-semibold mb-1 transition-colors",
                                        selectingEnd ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                                    )}>
                                        {labels.end_date ?? "End"}
                                    </div>
                                    <input
                                        type="text"
                                        value={endInputValue}
                                        onChange={(e) => handleEndInputChange(e.target.value)}
                                        onFocus={() => setSelectingEnd(true)}
                                        onBlur={() => {
                                            if (endDate) setEndInputValue(endDate.toLocaleDateString(locale, DATE_FORMAT_OPTIONS.SHORT))
                                        }}
                                        disabled={!startDate}
                                        placeholder="e.g. Jan 15, 2025"
                                        className={cn(
                                            "w-full bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 disabled:cursor-not-allowed",
                                            endDate
                                                ? (selectingEnd ? "text-neutral-900 dark:text-white" : "text-neutral-900 dark:text-white")
                                                : "text-neutral-500 dark:text-neutral-400"
                                        )}
                                    />
                                </div>

                                {/* Duration indicator */}
                                {daysDiff && (
                                    <div className="mt-3 flex items-center justify-center">
                                        <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                            {daysDiff} {daysDiff === 1 ? (labels.day ?? 'day') : (labels.days ?? 'days')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Footer actions */}
                            <div className="flex flex-col gap-2 p-3 border-t border-black/8 dark:border-white/8 mt-auto">
                                <button
                                    onClick={handleApply}
                                    disabled={!startDate || !endDate}
                                    className="h-8 w-full text-xs font-semibold bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {labels.apply ?? "Apply Range"}
                                </button>
                                <button
                                    onClick={handleClear}
                                    disabled={!value && !startDate}
                                    className="h-8 w-full text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    {labels.clear_range ?? "Clear"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Calendar panel — always visible */}
                    <div className="flex-1 p-3">
                        {/* Navigation header */}
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => {
                                    if (viewMode === 'days') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                                    else if (viewMode === 'months') setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))
                                    else setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1))
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => {
                                    if (viewMode === 'days') setViewMode('months')
                                    else if (viewMode === 'months') setViewMode('years')
                                }}
                                className="flex-1 text-center text-sm font-semibold text-neutral-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg py-1 px-2 transition-colors"
                            >
                                {viewMode === 'days' && `${viewDate.toLocaleDateString(locale, { month: 'long' })} ${viewDate.getFullYear()}`}
                                {viewMode === 'months' && viewDate.getFullYear()}
                                {viewMode === 'years' && `${years[0]} - ${years[years.length - 1]}`}
                            </button>

                            <button
                                onClick={() => {
                                    const now = new Date()
                                    if (viewMode === 'days') {
                                        const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                        if (next <= now) setViewDate(next)
                                    } else if (viewMode === 'months') {
                                        const next = new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1)
                                        if (next.getFullYear() <= CURRENT_YEAR) setViewDate(next)
                                    } else {
                                        const next = new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1)
                                        if (next.getFullYear() <= CURRENT_YEAR + 12) setViewDate(next)
                                    }
                                }}
                                disabled={
                                    (viewMode === 'days' && viewDate.getFullYear() === CURRENT_YEAR && viewDate.getMonth() >= CURRENT_MONTH) ||
                                    (viewMode === 'months' && viewDate.getFullYear() >= CURRENT_YEAR) ||
                                    (viewMode === 'years' && years[years.length - 1] >= CURRENT_YEAR)
                                }
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* View mode tabs */}
                        <div className="flex items-center justify-center gap-1 mb-3">
                            <button
                                onClick={() => setViewMode('days')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                                    viewMode === 'days' ? "bg-neutral-900 dark:bg-white text-white dark:text-black" : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"
                                )}
                            >
                                {labels.day_view ?? 'Day'}
                            </button>
                            <button
                                onClick={() => setViewMode('months')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                                    viewMode === 'months' ? "bg-neutral-900 dark:bg-white text-white dark:text-black" : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"
                                )}
                            >
                                {labels.month_view ?? 'Month'}
                            </button>
                            <button
                                onClick={() => setViewMode('years')}
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                                    viewMode === 'years' ? "bg-neutral-900 dark:bg-white text-white dark:text-black" : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white"
                                )}
                            >
                                {labels.year_view ?? 'Year'}
                            </button>
                        </div>

                        {/* Days view */}
                        {viewMode === 'days' && (
                            <>
                                <div className="grid grid-cols-7 mb-1">
                                    {weekDays.map((day, i) => (
                                        <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                <div className={cn("grid grid-cols-7 gap-y-0.5", dragging && "select-none")}>
                                    {calendarDays.map((day, i) => {
                                        if (!day) return <div key={i} className="h-8" />

                                        const outside = isOutsideMonth(day)
                                        const disabled = isDisabled(day)
                                        const start = isStartDate(day)
                                        const end = isEndDate(day)
                                        const inRange = isInRange(day)
                                        const today = isToday(day)
                                        const isDragOver = dragOverDay?.toDateString() === day.toDateString()
                                        const isSameDay = startDate && endDate && startDate.toDateString() === endDate.toDateString()

                                        return (
                                            <div
                                                key={i}
                                                className="relative h-8 flex items-center justify-center"
                                                onMouseEnter={() => handleDayMouseEnter(day)}
                                            >
                                                {!isSameDay && (inRange || start || end) && startDate && endDate && (
                                                    <div className={cn(
                                                        "absolute inset-y-0.5",
                                                        start ? "left-1/2 right-0" : end ? "left-0 right-1/2" : "inset-x-0",
                                                        "bg-black/5 dark:bg-white/5"
                                                    )} />
                                                )}

                                                <button
                                                    onClick={() => !dragging && handleDayClick(day)}
                                                    onMouseDown={(e) => {
                                                        if (start && !disabled) { e.preventDefault(); handleDragStart('start') }
                                                        else if (end && !disabled) { e.preventDefault(); handleDragStart('end') }
                                                    }}
                                                    disabled={disabled && !dragging}
                                                    className={cn(
                                                        "relative z-10 inline-flex items-center justify-center size-8 rounded-lg text-sm font-medium transition-all duration-200",
                                                        disabled && !dragging && "text-neutral-300 dark:text-neutral-700 cursor-not-allowed",
                                                        outside && !disabled && "text-neutral-400 dark:text-neutral-600",
                                                        (start || end) && !isDragOver && "bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200",
                                                        (start || end) && dragging && "cursor-grab active:cursor-grabbing",
                                                        !start && !end && !disabled && !outside && !isDragOver && "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white",
                                                        today && !start && !end && !isDragOver && "ring-1 ring-neutral-900/30 dark:ring-white/30 font-bold",
                                                        isDragOver && !disabled && "bg-neutral-700 dark:bg-neutral-200 text-white dark:text-black scale-110"
                                                    )}
                                                >
                                                    {day.getDate()}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}

                        {/* Months view */}
                        {viewMode === 'months' && (
                            <div className="grid grid-cols-4 gap-1">
                                {months.map((month) => {
                                    const disabled = isMonthDisabled(month.index)
                                    const isStart = isStartMonth(month.index)
                                    const isEnd = isEndMonth(month.index)
                                    const inRange = isMonthInRange(month.index)
                                    const isSameMonth = startDate && endDate &&
                                        startDate.getMonth() === endDate.getMonth() &&
                                        startDate.getFullYear() === endDate.getFullYear()

                                    return (
                                        <div key={month.index} className="relative flex items-center justify-center">
                                            {!isSameMonth && (inRange || isStart || isEnd) && startDate && endDate && (
                                                <div className={cn(
                                                    "absolute inset-y-0.5 rounded-sm bg-black/5 dark:bg-white/5",
                                                    isStart ? "left-1/2 right-0" : isEnd ? "left-0 right-1/2" : "inset-x-0"
                                                )} />
                                            )}
                                            <button
                                                onClick={() => handleMonthClick(month.index)}
                                                onDoubleClick={() => handleMonthClick(month.index, true)}
                                                disabled={disabled}
                                                className={cn(
                                                    "relative z-10 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
                                                    disabled && "text-neutral-300 dark:text-neutral-700 cursor-not-allowed",
                                                    (isStart || isEnd) && "bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200",
                                                    !isStart && !isEnd && !disabled && "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white"
                                                )}
                                            >
                                                {month.name}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Years view */}
                        {viewMode === 'years' && (
                            <div className="grid grid-cols-4 gap-1">
                                {years.map((year) => {
                                    const disabled = isYearDisabled(year)
                                    const isStart = isStartYear(year)
                                    const isEnd = isEndYear(year)
                                    const inRange = isYearInRange(year)
                                    const isSameYear = startDate && endDate &&
                                        startDate.getFullYear() === endDate.getFullYear()

                                    return (
                                        <div key={year} className="relative flex items-center justify-center">
                                            {!isSameYear && (inRange || isStart || isEnd) && startDate && endDate && (
                                                <div className={cn(
                                                    "absolute inset-y-0.5 rounded-sm bg-black/5 dark:bg-white/5",
                                                    isStart ? "left-1/2 right-0" : isEnd ? "left-0 right-1/2" : "inset-x-0"
                                                )} />
                                            )}
                                            <button
                                                onClick={() => handleYearClick(year)}
                                                onDoubleClick={() => handleYearClick(year, true)}
                                                disabled={disabled}
                                                className={cn(
                                                    "relative z-10 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
                                                    disabled && "text-neutral-300 dark:text-neutral-700 cursor-not-allowed",
                                                    (isStart || isEnd) && "bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200",
                                                    !isStart && !isEnd && !disabled && "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white"
                                                )}
                                            >
                                                {year}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Year jump — years view */}
                        {viewMode === 'years' && (
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{labels.jump_to_year ?? "Jump to:"}</span>
                                <input
                                    type="text"
                                    value={yearJumpInput}
                                    onChange={(e) => setYearJumpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleYearJump(yearJumpInput) }}
                                    placeholder="2013"
                                    className="w-16 px-2 py-1 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 text-center text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                                />
                                <button
                                    onClick={() => handleYearJump(yearJumpInput)}
                                    disabled={!yearJumpInput || yearJumpInput.length < 4}
                                    className="px-2 py-1 text-xs bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Go
                                </button>
                            </div>
                        )}

                        {/* Inline footer when inputs are hidden */}
                        {!showInputs && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/8 dark:border-white/8">
                                <button
                                    onClick={handleClear}
                                    disabled={!value && !startDate}
                                    className="h-8 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg px-2.5 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    {labels.clear_range ?? "Clear"}
                                </button>
                                {daysDiff && (
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                        {daysDiff} {daysDiff === 1 ? (labels.day ?? 'day') : (labels.days ?? 'days')}
                                    </span>
                                )}
                                <button
                                    onClick={handleApply}
                                    disabled={!startDate || !endDate}
                                    className="h-8 text-xs font-semibold bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl px-4 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {labels.apply ?? "Apply"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }
))

DateRangeCalendar.displayName = "DateRangeCalendar"

export { DateRangeCalendar }
export type { DateRangeCalendarProps, DateRangeCalendarLabels }
