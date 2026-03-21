"use client"

import * as React from "react"

type MeasurementStore = Record<string, number>

interface AdaptiveOptions<T> {
    /**
     * Function to calculate the layout state based on container width and element measurements.
     * Should return a stable value (primitive or object) to avoid unnecessary re-renders.
     */
    calculate: (containerWidth: number, measurements: MeasurementStore) => T
    
    /**
     * Initial state before any measurements are taken.
     */
    initialState: T
    
    /**
     * Optional default measurements to use before elements are rendered or if they are missing.
     */
    defaultMeasurements?: MeasurementStore
}

export function useAdaptiveLayout<T>({ calculate, initialState, defaultMeasurements = {} }: AdaptiveOptions<T>) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const elementRefs = React.useRef<Record<string, HTMLElement | null>>({})
    const measurementsRef = React.useRef<MeasurementStore>(defaultMeasurements)
    const [state, setState] = React.useState<T>(initialState)

    // Register an element to be measured
    const registerRef = React.useCallback((id: string) => (el: HTMLElement | null) => {
        elementRefs.current[id] = el
        // If we get a new element, we might want to trigger a check immediately?
        // But usually the ResizeObserver loop handles it.
    }, [])

    React.useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let rafId: number
        
        const check = () => {
            if (!container) return
            
            const width = container.offsetWidth
            
            // Update measurements for currently present elements
            Object.entries(elementRefs.current).forEach(([id, el]) => {
                if (el) {
                    measurementsRef.current[id] = el.scrollWidth
                }
            })

            const newState = calculate(width, measurementsRef.current)
            
            setState(prev => {
                // Simple equality check for primitives
                if (prev === newState) return prev
                // JSON stringify check for objects (simple deep compare)
                if (JSON.stringify(prev) === JSON.stringify(newState)) return prev
                return newState
            })
        }

        // Initial check
        check()

        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(check)
        })
        
        observer.observe(container)
        
        // Also observe all registered elements that are present?
        // For now, observing the container is usually enough for "fit" checks.
        // If elements change size internally without container changing, we might miss it.
        // But usually that triggers a re-render which might trigger this effect if deps change.
        
        return () => {
            cancelAnimationFrame(rafId)
            observer.disconnect()
        }
    }, [calculate])

    return {
        containerRef,
        registerRef,
        state
    }
}
