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
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateRangeCalendar } from "@/components/ui/date-range-calendar"
import type { DateRangeCalendarLabels } from "@/components/ui/date-range-calendar"

// ---------------------------------------------------------------------------
// Locale map
// ---------------------------------------------------------------------------
const LOCALE_MAP: Record<string, Locale> = { en: enUS, pt }

// ---------------------------------------------------------------------------
// Range addon config
// ---------------------------------------------------------------------------
interface DatePickerRangeConfig {
  value: { startDate: string | null; endDate: string | null } | null
  onRangeChange: (range: { startDate: string; endDate: string }) => void
  onClear: () => void
  /** Preferred panel position. 'auto' measures available space at runtime. @default 'auto' */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  labels?: DateRangeCalendarLabels
  /** Show text inputs for start/end dates. @default true */
  showInputs?: boolean
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DatePickerProps {
  value?: string
  onChange?: (iso: string) => void
  locale?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  /** When true, optimises for date-of-birth: opens to year first, hides "Today", caps maxYear to current year */
  dobMode?: boolean
  /** When provided, switches to range selection mode with an addon panel */
  range?: DatePickerRangeConfig
  /** Custom trigger element — replaces the default input button */
  trigger?: React.ReactNode
  /** Controlled open state */
  open?: boolean
  /** Controlled open state change handler */
  onOpenChange?: (open: boolean) => void
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
  range,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: DatePickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = React.useCallback((v: boolean) => {
    if (!isControlled) setInternalOpen(v)
    controlledOnOpenChange?.(v)
  }, [isControlled, controlledOnOpenChange])

  const loc = LOCALE_MAP[locale] ?? enUS

  // ---------------------------------------------------------------------------
  // Range mode — ResizeObserver-based dynamic positioning
  // ---------------------------------------------------------------------------
  const rangeContainerRef = React.useRef<HTMLDivElement>(null)
  const [resolvedPosition, setResolvedPosition] = React.useState<'top' | 'bottom' | 'left' | 'right'>(() => {
    const p = range?.position ?? 'auto'
    return p === 'auto' ? 'left' : p
  })

  React.useEffect(() => {
    if (!range || !open) return
    const el = rangeContainerRef.current
    if (!el) return
    const preferred = range.position ?? 'auto'

    const resolve = () => {
      const { width } = el.getBoundingClientRect()
      const HORIZONTAL_THRESHOLD = 520
      if (preferred === 'auto') {
        setResolvedPosition(width >= HORIZONTAL_THRESHOLD ? 'left' : 'bottom')
      } else if (preferred === 'left' || preferred === 'right') {
        setResolvedPosition(width >= HORIZONTAL_THRESHOLD ? preferred : 'bottom')
      } else {
        setResolvedPosition(preferred)
      }
    }

    const observer = new ResizeObserver(resolve)
    observer.observe(el)
    resolve()

    return () => observer.disconnect()
  }, [range, open, range?.position])

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
      onChange?.(format(day, "yyyy-MM-dd"))
      setOpen(false)
    }
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
    if (dobMode && year > CURRENT_YEAR) return
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

  const forwardDisabled = dobMode && (
    (view === 'date' && displayMonth.getFullYear() === CURRENT_YEAR && displayMonth.getMonth() >= CURRENT_MONTH) ||
    (view === 'month' && displayMonth.getFullYear() >= CURRENT_YEAR) ||
    (view === 'year' && years[years.length - 1] >= CURRENT_YEAR)
  )

  // ---------------------------------------------------------------------------
  // Range mode: auto-close on apply/clear
  // ---------------------------------------------------------------------------
  const handleRangeChange = React.useCallback((r: { startDate: string; endDate: string }) => {
    range?.onRangeChange(r)
    setOpen(false)
  }, [range, setOpen])

  const handleRangeClear = React.useCallback(() => {
    range?.onClear()
    setOpen(false)
  }, [range, setOpen])

  return (
    <>
      {/* Trigger */}
      {trigger ? (
        <div onClick={() => !disabled && setOpen(true)} className={cn(disabled && "opacity-50 cursor-not-allowed pointer-events-none")}>
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={cn(
            "relative flex items-center w-full h-14 px-4 pr-12 pt-4 text-left font-normal group text-[15px] transition-all duration-200",
            PRISM.surface,
            PRISM.focusRing,
            open && PRISM.activeRing,
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          {/* Floating label */}
          <span
            className={cn(
              "absolute left-4 top-4 text-[15px] transition-all duration-200 ease-out pointer-events-none text-neutral-400 origin-left",
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            <CalendarIcon className="shrink-0 size-4 text-neutral-400" />
          </span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "gap-0 p-0 overflow-hidden",
            range
              ? "w-[calc(100vw-2rem)] max-w-[580px]"
              : "w-[calc(100vw-4rem)] max-w-[360px]"
          )}
        >
          <DialogTitle className="sr-only">{range ? "Date Range" : placeholder}</DialogTitle>

          {/* ── Range mode ────────────────────────────────────── */}
          {range ? (
            <div ref={rangeContainerRef}>
              <DateRangeCalendar
                value={range.value}
                onRangeChange={handleRangeChange}
                onClear={handleRangeClear}
                locale={locale}
                labels={range.labels}
                showInputs={range.showInputs ?? true}
                panelPosition={resolvedPosition}
              />
            </div>
          ) : (
          /* ── Single-date mode ───────────────────────────────── */
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
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
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
              disabled={!!forwardDisabled}
              onClick={() => {
                if (forwardDisabled) return
                if (view === 'date') setDisplayMonth(addMonths(displayMonth, 1))
                else if (view === 'month') setDisplayMonth(setYear(displayMonth, displayMonth.getFullYear() + 1))
                else setDisplayMonth(setYear(displayMonth, displayMonth.getFullYear() + 12))
              }}
              className={cn(
                "inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                forwardDisabled
                  ? "text-neutral-400 cursor-not-allowed"
                  : "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white"
              )}
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
                view === 'date' ? "bg-black dark:bg-white text-white dark:text-black" : "text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
              )}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setView('month')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                view === 'month' ? "bg-black dark:bg-white text-white dark:text-black" : "text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView('year')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                view === 'year' ? "bg-black dark:bg-white text-white dark:text-black" : "text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
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
                  <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-neutral-400 uppercase tracking-wider">
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
                          disabled && "text-neutral-400 cursor-not-allowed",
                          outside && !disabled && "text-neutral-400",
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
              {months.map((m, i) => {
                const isFutureMonth = dobMode && (
                  displayMonth.getFullYear() > CURRENT_YEAR ||
                  (displayMonth.getFullYear() === CURRENT_YEAR && i > CURRENT_MONTH)
                )
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!!isFutureMonth}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
                      isFutureMonth
                        ? "text-neutral-400 cursor-not-allowed"
                        : displayMonth.getMonth() === i
                          ? "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100"
                          : "hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white"
                    )}
                    onClick={() => {
                      if (!isFutureMonth) {
                        setDisplayMonth(startOfMonth(setMonth(displayMonth, i)))
                        setView('date')
                      }
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          )}

          {/* Years view */}
          {view === 'year' && (
            <div className="grid grid-cols-4 gap-1">
              {years.map((y) => {
                const isFutureYear = dobMode && y > CURRENT_YEAR
                return (
                  <div key={y} className="relative flex items-center justify-center">
                    <button
                      type="button"
                      disabled={isFutureYear}
                      className={cn(
                        "relative z-10 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200",
                        isFutureYear
                          ? "text-neutral-400 cursor-not-allowed"
                          : displayMonth.getFullYear() === y
                            ? "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100"
                            : "hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white"
                      )}
                      onClick={() => {
                        if (!isFutureYear) {
                          setDisplayMonth(startOfMonth(setYear(displayMonth, y)))
                          setView(dobMode ? 'month' : 'date')
                        }
                      }}
                    >
                      {formatYear(y)}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-black/8 dark:border-white/8 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {!dobMode && view === 'date' && (
                <button
                  type="button"
                  className="px-3 h-8 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  onClick={() => handleSelect(new Date())}
                >
                  Today
                </button>
              )}
              {selected && (
                <button
                  type="button"
                  className="px-3 h-8 text-xs font-medium rounded-lg text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                  onClick={() => { onChange?.(''); setOpen(false) }}
                >
                  Clear
                </button>
              )}
              {view === 'year' && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={yearJumpInput}
                    onChange={(e) => setYearJumpInput(e.target.value.replace(/[^0-9\-bcBC ]/g, '').slice(0, 8))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleYearJump(yearJumpInput) }}
                    placeholder="Jump to year"
                    className="w-28 px-2.5 h-8 text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 text-black dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleYearJump(yearJumpInput)}
                    disabled={!yearJumpInput}
                    className="px-2.5 h-8 text-xs font-medium bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    Go
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="px-4 h-8 text-xs font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shrink-0"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
          )}
      </DialogContent>
    </Dialog>
    </>
  )
}
