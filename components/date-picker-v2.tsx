"use client"

/**
 * V2 — Calendar with Month/Year Dropdowns
 * Like V1 but replaces the caption with <select> dropdowns for month and year,
 * making it fast to jump to any date (ideal for DOB / far dates).
 * This is the shadcn "date of birth" recommended pattern.
 */

import * as React from "react"
import {
  format,
  parse,
  isValid,
  setMonth,
  setYear,
  startOfMonth,
} from "date-fns"
import { enUS, pt } from "date-fns/locale"
import type { Locale } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const LOCALE_MAP: Record<string, Locale> = { en: enUS, pt }

interface DatePickerV2Props {
  value: string
  onChange: (iso: string) => void
  locale?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  minYear?: number
  maxYear?: number
}

export function DatePickerV2({
  value,
  onChange,
  locale = "en",
  disabled,
  placeholder = "Pick a date",
  className,
  minYear = 1920,
  maxYear,
}: DatePickerV2Props) {
  const [open, setOpen] = React.useState(false)
  const loc = LOCALE_MAP[locale] ?? enUS
  const effectiveMaxYear = maxYear ?? new Date().getFullYear() + 10

  const selected = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [value])

  // The month currently displayed in the calendar
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    selected ?? new Date()
  )

  // Sync display when value changes externally
  React.useEffect(() => {
    if (selected) setDisplayMonth(selected)
  }, [selected])

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"))
      setOpen(false)
    }
  }

  const months = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        format(new Date(2024, i, 1), "MMMM", { locale: loc })
      ),
    [loc]
  )

  const years = React.useMemo(
    () =>
      Array.from(
        { length: effectiveMaxYear - minYear + 1 },
        (_, i) => minYear + i
      ),
    [minYear, effectiveMaxYear]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected ? format(selected, "PPP", { locale: loc }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Month/Year dropdowns */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <select
              value={displayMonth.getMonth()}
              onChange={(e) =>
                setDisplayMonth(
                  startOfMonth(setMonth(displayMonth, Number(e.target.value)))
                )
              }
              className="bg-transparent border rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring flex-1 cursor-pointer"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={displayMonth.getFullYear()}
              onChange={(e) =>
                setDisplayMonth(
                  startOfMonth(setYear(displayMonth, Number(e.target.value)))
                )
              }
              className="bg-transparent border rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring w-[90px] cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            locale={loc}
            showOutsideDays
            classNames={{
              months: "flex flex-col gap-2",
              month: "flex flex-col gap-2",
              month_caption: "hidden",
              nav: "hidden",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday:
                "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              week: "flex w-full mt-2",
              day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md",
              day_button:
                "inline-flex items-center justify-center size-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer",
              selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              today: "bg-accent text-accent-foreground",
              outside:
                "text-muted-foreground opacity-50 aria-selected:bg-accent/50",
              disabled: "text-muted-foreground opacity-50",
              hidden: "invisible",
            }}
          />

          {/* Today shortcut */}
          <div className="border-t mt-2 pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                onChange(format(today, "yyyy-MM-dd"))
                setDisplayMonth(today)
                setOpen(false)
              }}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
