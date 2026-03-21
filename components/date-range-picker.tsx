"use client"

import * as React from "react"

import { DateRangeCalendar } from "@/components/ui/date-range-calendar"

// ==============================================================================
// TYPES
// ==============================================================================

interface DateRangePickerProps {
    customDateRange: { startDate: string | null; endDate: string | null } | null
    onRangeChange: (range: { startDate: string; endDate: string }) => void
    onClear: () => void
    onClose: () => void
    locale: string
    labels: Record<string, string>
}

// ==============================================================================
// DATE RANGE PICKER COMPONENT
// ==============================================================================

export const DateRangePicker = React.memo(function DateRangePicker({ 
    customDateRange, 
    onRangeChange, 
    onClear, 
    onClose,
    locale,
    labels 
}: DateRangePickerProps) {
    const handleRangeChange = React.useCallback((range: { startDate: string; endDate: string }) => {
        onRangeChange(range)
        onClose()
    }, [onRangeChange, onClose])

    const handleClear = React.useCallback(() => {
        onClear()
        onClose()
    }, [onClear, onClose])

    return (
        <DateRangeCalendar
            value={customDateRange}
            onRangeChange={handleRangeChange}
            onClear={handleClear}
            locale={locale}
            labels={labels}
            showInputs
        />
    )
})
