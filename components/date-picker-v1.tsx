"use client"

/**
 * V1 — Standard Calendar Popover
 * The classic pattern: click a button → popover with a full calendar grid.
 * Arrow buttons to navigate months. Click a day to select. Identical to
 * shadcn/ui, Ant Design, MUI, and Carbon.
 */

import * as React from "react"
import { format, parse, isValid } from "date-fns"
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

interface DatePickerV1Props {
  value: string
  onChange: (iso: string) => void
  locale?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DatePickerV1({
  value,
  onChange,
  locale = "en",
  disabled,
  placeholder = "Pick a date",
  className,
}: DatePickerV1Props) {
  const [open, setOpen] = React.useState(false)
  const loc = LOCALE_MAP[locale] ?? enUS

  const selected = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [value])

  function handleSelect(day: Date | undefined) {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"))
      setOpen(false)
    }
  }

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
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          locale={loc}
          showOutsideDays
          className="p-3"
          classNames={{
            months: "flex flex-col sm:flex-row gap-2",
            month: "flex flex-col gap-4",
            month_caption:
              "flex justify-center pt-1 relative items-center w-full",
            caption_label: "text-sm font-medium",
            nav: "flex items-center gap-1",
            button_previous:
              "absolute left-1 size-7 inline-flex items-center justify-center rounded-md border bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-accent",
            button_next:
              "absolute right-1 size-7 inline-flex items-center justify-center rounded-md border bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-accent",
            month_grid: "w-full border-collapse",
            weekdays: "flex",
            weekday:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            week: "flex w-full mt-2",
            day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected])]:rounded-md",
            day_button:
              "inline-flex items-center justify-center size-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground",
            selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            today: "bg-accent text-accent-foreground",
            outside:
              "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
            disabled: "text-muted-foreground opacity-50",
            hidden: "invisible",
          }}
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ),
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
