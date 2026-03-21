"use client"

import * as React from "react"
import { saveChartSettings, getChartSettings } from "@/app/actions/chart-settings"
import { MAX_CHARTS } from "@/lib/chart-constants"
import type { ChartInstance, MetricType, DisplayMode, CustomDateRange } from "@/lib/chart-types"
import { generateChartId, getCategoryOptions } from "@/lib/chart-utils"

// ==============================================================================
// CHART MANAGER HOOK
// ==============================================================================

interface UseChartManagerReturn {
    charts: ChartInstance[]
    selectedChartId: string
    selectedChart: ChartInstance
    categoryOptions: readonly string[]
    showBorder: string | null
    settingsOpen: boolean
    settingsLoaded: boolean

    // Chart CRUD
    addChart: (index?: number) => void
    deleteChart: (id: string) => void
    moveChart: (id: string, direction: 'left' | 'right') => void
    updateSelectedChart: (updates: Partial<ChartInstance>) => void

    // Selection & UI
    setSelectedChartId: (id: string) => void
    setShowBorder: (id: string | null) => void
    setSettingsOpen: (open: boolean) => void
    triggerBorder: (id: string) => void

    // Period controls
    setPeriodType: (periodType: string) => void
    setTimeOffset: (updater: number | ((prev: number) => number)) => void
    setCustomDateRange: (range: CustomDateRange | undefined) => void
    clearCustomDateRange: () => void

    // Category controls
    handleCategoryToggle: (category: string) => void
    handleTotalToggle: () => void
    handleSelectAll: () => void
    handleClearAll: () => void

    // Refs
    chartAreaRef: React.RefObject<HTMLDivElement | null>
}

const BORDER_TIMEOUT = 3000

export function useChartManager(): UseChartManagerReturn {
    const [charts, setCharts] = React.useState<ChartInstance[]>([
        { id: generateChartId(), metricType: "expenses", displayMode: "area", selectedCategories: [], showTotal: true, periodType: "month", timeOffset: 0, customDateRange: undefined }
    ])
    const [selectedChartId, setSelectedChartId] = React.useState<string>(charts[0].id)
    const [showBorder, setShowBorder] = React.useState<string | null>(null)
    const [settingsOpen, setSettingsOpen] = React.useState(false)
    const [settingsLoaded, setSettingsLoaded] = React.useState(false)

    const borderTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const chartAreaRef = React.useRef<HTMLDivElement>(null)
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    // Derived state
    const selectedChart = React.useMemo(
        () => charts.find(c => c.id === selectedChartId) ?? charts[0],
        [charts, selectedChartId]
    )
    const categoryOptions = React.useMemo(
        () => getCategoryOptions(selectedChart.metricType),
        [selectedChart.metricType]
    )

    // Chart CRUD operations
    const updateSelectedChart = React.useCallback(
        (updates: Partial<ChartInstance>) => setCharts(prev => prev.map(c => c.id === selectedChartId ? { ...c, ...updates } : c)),
        [selectedChartId]
    )

    const addChart = React.useCallback((index?: number) => {
        if (charts.length >= MAX_CHARTS) return
        const newChart: ChartInstance = {
            id: generateChartId(),
            metricType: selectedChart.metricType === "expenses" ? "income" : "expenses",
            displayMode: "area",
            selectedCategories: [],
            showTotal: true,
            periodType: "month",
            timeOffset: 0,
            customDateRange: undefined
        }
        setCharts(prev => {
            if (index === undefined || index >= prev.length) return [...prev, newChart]
            const newCharts = [...prev]
            newCharts.splice(index, 0, newChart)
            return newCharts
        })
        setSelectedChartId(newChart.id)
    }, [charts.length, selectedChart.metricType])

    const deleteChart = React.useCallback((id: string) => {
        if (charts.length <= 1) return
        const currentIndex = charts.findIndex(c => c.id === id)
        const newCharts = charts.filter(c => c.id !== id)
        setCharts(newCharts)
        if (id === selectedChartId) setSelectedChartId(newCharts[Math.max(0, currentIndex - 1)].id)
    }, [charts, selectedChartId])

    const moveChart = React.useCallback((id: string, direction: 'left' | 'right') => {
        setCharts(prev => {
            const index = prev.findIndex(c => c.id === id)
            if ((direction === 'left' && index <= 0) || (direction === 'right' && index >= prev.length - 1)) return prev
            const newCharts = [...prev]
            const swapIndex = direction === 'left' ? index - 1 : index + 1
            ;[newCharts[index], newCharts[swapIndex]] = [newCharts[swapIndex], newCharts[index]]
            return newCharts
        })
    }, [])

    // Period controls
    const setPeriodType = React.useCallback(
        (newPeriodType: string) => setCharts(prev => prev.map(c => c.id === selectedChartId ? { ...c, periodType: newPeriodType, timeOffset: 0 } : c)),
        [selectedChartId]
    )

    const setTimeOffset = React.useCallback(
        (updater: number | ((prev: number) => number)) => setCharts(prev => prev.map(c => c.id === selectedChartId ? { ...c, timeOffset: typeof updater === 'function' ? updater(c.timeOffset) : updater } : c)),
        [selectedChartId]
    )

    const setCustomDateRange = React.useCallback(
        (range: CustomDateRange | undefined) => setCharts(prev => prev.map(c => c.id === selectedChartId ? { ...c, customDateRange: range } : c)),
        [selectedChartId]
    )

    const clearCustomDateRange = React.useCallback(
        () => setCharts(prev => prev.map(c => c.id === selectedChartId ? { ...c, customDateRange: undefined } : c)),
        [selectedChartId]
    )

    // Category controls
    const handleCategoryToggle = React.useCallback((category: string) => {
        const newSelected = selectedChart.selectedCategories.includes(category)
            ? selectedChart.selectedCategories.filter(c => c !== category)
            : [...selectedChart.selectedCategories, category]
        if (newSelected.length === 0) {
            updateSelectedChart({ showTotal: true, selectedCategories: [] })
        } else {
            updateSelectedChart({ showTotal: false, selectedCategories: newSelected })
        }
    }, [selectedChart.selectedCategories, updateSelectedChart])

    const handleTotalToggle = React.useCallback(
        () => updateSelectedChart({ showTotal: true, selectedCategories: [] }),
        [updateSelectedChart]
    )

    const handleSelectAll = React.useCallback(
        () => updateSelectedChart({ showTotal: false, selectedCategories: [...categoryOptions] }),
        [categoryOptions, updateSelectedChart]
    )

    const handleClearAll = handleTotalToggle

    // Border management
    const triggerBorder = React.useCallback((id: string) => {
        setShowBorder(id)
    }, [])

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (chartAreaRef.current && !chartAreaRef.current.contains(e.target as Node)) setShowBorder(null)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    React.useEffect(() => {
        if (showBorder) {
            if (borderTimeoutRef.current) clearTimeout(borderTimeoutRef.current)
            borderTimeoutRef.current = setTimeout(() => setShowBorder(null), BORDER_TIMEOUT)
        }
        return () => { if (borderTimeoutRef.current) clearTimeout(borderTimeoutRef.current) }
    }, [showBorder])

    // Load settings on mount
    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedSettings = await getChartSettings()
                if (savedSettings && savedSettings.charts.length > 0) {
                    const validatedCharts = savedSettings.charts.map(chart => ({
                        ...chart,
                        showTotal: chart.selectedCategories.length === 0 ? true : chart.showTotal
                    }))
                    setCharts(validatedCharts)
                    setSelectedChartId(savedSettings.selectedChartId)
                }
            } catch (error) {
                console.error('Failed to load chart settings:', error)
            } finally {
                setSettingsLoaded(true)
            }
        }
        loadSettings()
    }, [])

    // Save settings when they change (debounced)
    React.useEffect(() => {
        if (!settingsLoaded) return
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => {
            saveChartSettings({ charts, selectedChartId }).catch(error => {
                console.error('Failed to save chart settings:', error)
            })
        }, 500)

        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
    }, [charts, selectedChartId, settingsLoaded])

    return {
        charts,
        selectedChartId,
        selectedChart,
        categoryOptions,
        showBorder,
        settingsOpen,
        settingsLoaded,
        addChart,
        deleteChart,
        moveChart,
        updateSelectedChart,
        setSelectedChartId,
        setShowBorder,
        setSettingsOpen,
        triggerBorder,
        setPeriodType,
        setTimeOffset,
        setCustomDateRange,
        clearCustomDateRange,
        handleCategoryToggle,
        handleTotalToggle,
        handleSelectAll,
        handleClearAll,
        chartAreaRef,
    }
}
