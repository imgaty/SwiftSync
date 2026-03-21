"use client"

import * as React from "react"
import {
  format,
  parse,
  isValid,
  setMonth,
  setYear,
  startOfMonth,
  addMonths,
  subMonths,
} from "date-fns"
import { enUS, pt } from "date-fns/locale"
import type { Locale } from "date-fns"
import { CalendarIcon, XIcon, ChevronLeft, ChevronRight, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { SURFACE, ACTIVE_RING, FOCUS_RING } from "@/lib/styles"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ---------------------------------------------------------------------------
// Locale map
// ---------------------------------------------------------------------------
const LOCALE_MAP: Record<string, Locale> = { en: enUS, pt }

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  locale?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  /** When true, optimises for date-of-birth: opens to year first, hides "Today", caps maxYear to current year */
  dobMode?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
/** Format a year number for display, showing "X BC" for years <= 0 */
function formatYear(y: number): string {
  if (y <= 0) return `${Math.abs(y - 1)} BC`
  return String(y)
}

export function DatePicker({
  value,
  onChange,
  locale = "en",
  disabled,
  placeholder = "Pick a date",
  className,
  dobMode = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const loc = LOCALE_MAP[locale] ?? enUS

  // Parse the ISO value into a Date
  const selected = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [value])

  // Calendar display month — synced to selected or today
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    selected ?? new Date()
  )

  // Internal View State for DatePicker Popover: 'date', 'month', 'year'
  const [view, setView] = React.useState<'date' | 'month' | 'year'>('date')
  const [yearJumpInput, setYearJumpInput] = React.useState('')

  const CURRENT_YEAR = new Date().getFullYear()
  const CURRENT_MONTH = new Date().getMonth()

  // When the popover opens, jump to the selected date (or today) and reset view
  React.useEffect(() => {
    if (open) {
      setDisplayMonth(selected ?? new Date())
      setView(dobMode && !selected ? 'year' : 'date')
    }
  }, [open, selected, dobMode])

  // Also sync when value changes externally while closed
  React.useEffect(() => {
    if (!open && selected) setDisplayMonth(selected)
  }, [selected, open])

  // Select a day — commit and return to date view if we weren't already (though we should be)
  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"))
      setOpen(false)
    }
  }

  // Clear the value
  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
  }

  // Jump to a specific year
  function handleYearJump(input: string) {
    // Support negative years and "BC" suffix
    const trimmed = input.trim().toLowerCase()
    let year: number
    if (trimmed.endsWith('bc')) {
      const num = parseInt(trimmed.replace(/bc/i, '').trim())
      if (isNaN(num)) return
      year = -(num - 1) // year 1 BC = year 0, 2 BC = year -1, etc.
    } else {
      year = parseInt(trimmed)
      if (isNaN(year)) return
    }
    setDisplayMonth(startOfMonth(setYear(displayMonth, year)))
    setYearJumpInput('')
  }

  // Localized month names
  const months = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        format(new Date(2024, i, 1), "MMM", { locale: loc })
      ),
    [loc]
  )

  // Year list — paginated 12-year grid, infinite in both directions
  const years = React.useMemo(() => {
    const yr = displayMonth.getFullYear()
    const base = Math.floor(yr / 12) * 12
    return Array.from({ length: 12 }, (_, i) => base + i)
  }, [displayMonth])

  const todayDate = React.useMemo(() => new Date(), [])
  const todayDateString = React.useMemo(() => todayDate.toDateString(), [todayDate])

  // Calendar days computation (matching date-range-picker layout)
  const firstDayOfMonth = React.useMemo(() =>
    new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1),
    [displayMonth]
  )
  const lastDayOfMonth = React.useMemo(() =>
    new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0),
    [displayMonth]
  )
  const startDay = React.useMemo(() => {
    const day = firstDayOfMonth.getDay()
    return day === 0 ? 6 : day - 1 // Monday = 0, Sunday = 6
  }, [firstDayOfMonth])

  const calendarDays = React.useMemo(() => {
    const days: (Date | null)[] = []
    const prevMonthLastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, prevMonthLastDay - i))
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i))
    }
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, i))
    }
    return days
  }, [displayMonth, startDay, lastDayOfMonth])

  const weekDays = React.useMemo(() => {
    const days: string[] = []
    const baseDate = new Date(2024, 0, 1) // Monday
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + i)
      days.push(d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2))
    }
    return days
  }, [locale])

  const isOutsideMonth = React.useCallback((date: Date) =>
    date.getMonth() !== displayMonth.getMonth(),
    [displayMonth]
  )
  const isDisabledDate = React.useCallback((date: Date) => {
    if (dobMode && date.getTime() > todayDate.getTime()) return true
    return false
  }, [dobMode, todayDate])
  const isSelectedDate = React.useCallback((date: Date) =>
    selected ? selected.toDateString() === date.toDateString() : false,
    [selected]
  )
  const isTodayDate = React.useCallback((date: Date) =>
    date.toDateString() === todayDateString,
    [todayDateString]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "relative flex items-center w-full h-14 px-4 pr-12 pt-4 text-left font-normal group text-[15px] transition-all duration-200",
            SURFACE,
            FOCUS_RING,
            open && ACTIVE_RING,
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {/* Floating label */}
          <span
            className={cn(
              "absolute left-4 top-4 text-[15px] transition-all duration-200 ease-out pointer-events-none text-neutral-500 dark:text-neutral-400 origin-left",
              (selected || open)
                ? "scale-[0.75] -translate-y-3"
                : ""
            )}
          >
            {placeholder}
          </span>
          {/* Value text */}
          <span className={cn(
            "text-[15px] transition-all duration-200 truncate",
            selected ? "text-black dark:text-white" : "opacity-0"
          )}>
            {selected ? format(selected, "PP", { locale: loc }) : "\u00A0"}
          </span>
          {/* Icons — absolutely positioned & vertically centered */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {/* Clear button — only when there's a value and not disabled */}
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                className="shrink-0 rounded-lg p-1 opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-all z-10"
              >
                <XIcon className="size-4" />
              </span>
            )}
            <CalendarIcon className="shrink-0 size-4 text-neutral-500 dark:text-neutral-400" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className={cn("w-[360px] p-0 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-xl")}
        align="start"
      >
        <div className="p-3">
          {/* Navigation header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => {
                if (view === 'date') setDisplayMonth(subMonths(displayMonth, 1))
                else if (view === 'month') setDisplayMonth(setYear(displayMonth, displayMonth.getFullYear() - 1))
                else setDisplayMonth(setYear(displayMonth, displayMonth.getFullYear() - 12))
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (view === 'date') setView('month')
                else if (view === 'month') setView('year')
              }}
              className="flex-1 text-center text-sm font-semibold text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg py-1 px-2 transition-colors"
            >
              {view === 'date' && `${format(displayMonth, "MMMM", { locale: loc })} ${formatYear(displayMonth.getFullYear())}`}
              {view === 'month' && formatYear(displayMonth.getFullYear())}
              {view === 'year' && years.length > 0 && `${formatYear(years[0])} – ${formatYear(years[years.length - 1])}`}
            </button>

            <button
              type="button"
              onClick={() => {
                if (view === 'date') setDisplayMonth(addMonths(displayMonth, 1))
                else if (view === 'month') setDisplayMonth(setYear(displayMonth, displayMonth.getFullYear() + 1))
                else setDisplayMonth(setYear(displayMonth, displayMonth.getFullYear() + 12))
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View mode tabs */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <button
              type="button"
              onClick={() => setView('date')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                view === 'date' ? "bg-black dark:bg-white text-white dark:text-black" : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setView('month')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                view === 'month' ? "bg-black dark:bg-white text-white dark:text-black" : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView('year')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                view === 'year' ? "bg-black dark:bg-white text-white dark:text-black" : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
              )}
            >
              Year
            </button>
          </div>

          {/* Days view */}
          {view === 'date' && (
            <>
              <div className="grid grid-cols-7 mb-1">
                {weekDays.map((day, i) => (
                  <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={i} className="h-8" />
                  const outside = isOutsideMonth(day)
                  const disabled = isDisabledDate(day)
                  const isSelected = isSelectedDate(day)
                  const today = isTodayDate(day)
                  return (
                    <div key={i} className="relative h-8 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => { if (!disabled) handleSelect(day) }}
                        disabled={disabled}
                        className={cn(
                          "inline-flex items-center justify-center size-8 rounded-lg text-sm font-medium transition-all duration-200",
                          disabled && "text-neutral-300 dark:text-neutral-700 cursor-not-allowed",
                          outside && !disabled && "text-neutral-400 dark:text-neutral-600",
                          isSelected && "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100",
                          !isSelected && !disabled && !outside && "hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white",
                          today && !isSelected && "ring-1 ring-black/30 dark:ring-white/30 font-bold"
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
          {view === 'month' && (
            <div className="grid grid-cols-4 gap-1">
              {months.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
                    displayMonth.getMonth() === i
                      ? "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100"
                      : "hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white"
                  )}
                  onClick={() => {
                    setDisplayMonth(startOfMonth(setMonth(displayMonth, i)))
                    setView('date')
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Years view */}
          {view === 'year' && (
            <div className="grid grid-cols-4 gap-1">
              {years.map((y) => (
                <div key={y} className="relative flex items-center justify-center">
                  <button
                    type="button"
                    className={cn(
                      "relative z-10 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
                      displayMonth.getFullYear() === y
                        ? "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100"
                        : "hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white"
                    )}
                    onClick={() => {
                      setDisplayMonth(startOfMonth(setYear(displayMonth, y)))
                      setView(dobMode ? 'month' : 'date')
                    }}
                  >
                    {formatYear(y)}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Year jump — years view */}
          {view === 'year' && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Jump to:</span>
              <input
                type="text"
                value={yearJumpInput}
                onChange={(e) => setYearJumpInput(e.target.value.replace(/[^0-9\-bcBC ]/g, '').slice(0, 8))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleYearJump(yearJumpInput) }}
                placeholder="e.g. 2013 or 500 BC"
                className="w-28 px-2 py-1 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 text-center text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
              />
              <button
                type="button"
                onClick={() => handleYearJump(yearJumpInput)}
                disabled={!yearJumpInput}
                className="px-2 py-1 text-xs bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Go
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/8 dark:border-white/8">
            {value ? (
              <button
                type="button"
                className="h-7 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg px-2.5 transition-colors flex items-center gap-1.5"
                onClick={() => {
                  onChange("")
                  setDisplayMonth(new Date())
                  setOpen(false)
                }}
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            ) : (
              <span />
            )}
            {dobMode ? (
              <button
                type="button"
                className="h-7 text-xs font-medium rounded-lg px-3 bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                onClick={() => setView('year')}
              >
                Pick Year
              </button>
            ) : (
              <button
                type="button"
                className="h-7 text-xs font-medium rounded-lg px-3 bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                onClick={() => {
                  const today = new Date()
                  onChange(format(today, "yyyy-MM-dd"))
                  setDisplayMonth(today)
                  setOpen(false)
                }}
              >
                Today
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
