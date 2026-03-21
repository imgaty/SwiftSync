"use client"

import * as React from "react"

// ==============================================================================
// TYPES
// ==============================================================================

/**
 * Element configuration - defines all possible views for an element
 * Views are ordered from most spacious (first) to most compact (last)
 */
export interface ElementConfig {
    /** Array of view names, ordered from most spacious (first) to most compact (last) */
    views: readonly string[]
    /** Priority - higher priority elements collapse LAST (default: 0) */
    priority?: number
    /** 
     * Gap to add after this element's measured width 
     * Can be a fixed number or a function that returns the gap based on current views
     */
    gap?: number | ((views: Record<string, string>) => number)
}

/**
 * Configuration passed to the hook
 */
export type ResponsiveConfig = Record<string, ElementConfig>

/**
 * Return type - maps element names to their currently active view
 */
export type ResponsiveViews<T extends ResponsiveConfig> = {
    [K in keyof T]: T[K]['views'][number]
}

/**
 * Refs returned for each element
 */
export type ElementRefs<T extends ResponsiveConfig> = {
    [K in keyof T]: React.RefObject<HTMLElement | null>
}

// ==============================================================================
// MAIN HOOK - Dynamic width measurement with collision detection
// ==============================================================================

/**
 * Universal responsive layout hook with dynamic width measurement
 * 
 * Works like collision detection - measures actual element widths and
 * progressively collapses views based on available space.
 * 
 * Key features:
 * - Measures actual rendered widths (not fixed values)
 * - Stores measurements for each view state
 * - Progressively collapses based on priority
 * - Handles interdependent layouts
 * 
 * @example
 * ```tsx
 * const { views, containerRef, elementRefs } = useResponsiveLayout({
 *   header: {
 *     views: ['horizontal', 'vertical'],
 *     priority: 0, // Collapses first (lowest priority)
 *   },
 *   timeToggle: {
 *     views: ['buttons', 'dropdown'],
 *     priority: 1,
 *     gap: 12,
 *   },
 *   controls: {
 *     views: ['row', 'wrapped'],
 *     priority: 2, // Collapses last (highest priority)
 *   },
 * })
 * 
 * const horizontalLayout = views.header === 'horizontal'
 * const timeToggleCollapsed = views.timeToggle === 'dropdown'
 * 
 * return (
 *   <div ref={containerRef}>
 *     <div ref={elementRefs.header}>...</div>
 *     <div ref={elementRefs.timeToggle}>
 *       {views.timeToggle === 'buttons' ? <Buttons/> : <Dropdown/>}
 *     </div>
 *   </div>
 * )
 * ```
 */
export function useResponsiveLayout<T extends ResponsiveConfig, C extends HTMLElement = HTMLDivElement>(config: T) {
    const containerRef = React.useRef<C>(null)
    
    // Create stable refs for each element (only recreate if keys change)
    const elementRefsRef = React.useRef<ElementRefs<T> | null>(null)
    const configKeys = Object.keys(config).sort().join(',')
    
    if (!elementRefsRef.current) {
        const refs = {} as ElementRefs<T>
        for (const key of Object.keys(config)) {
            refs[key as keyof T] = React.createRef<HTMLElement>()
        }
        elementRefsRef.current = refs
    }
    
    const elementRefs = elementRefsRef.current
    
    // Initialize with most spacious views (will collapse as needed)
    const getInitialViews = () => {
        const initial = {} as ResponsiveViews<T>
        for (const [key, elementConfig] of Object.entries(config)) {
            // Start with most spacious view
            initial[key as keyof T] = elementConfig.views[0] as ResponsiveViews<T>[keyof T]
        }
        return initial
    }
    
    const [views, setViews] = React.useState<ResponsiveViews<T>>(getInitialViews)
    
    // Store measured widths: "elementName:viewName" -> width
    const measuredWidthsRef = React.useRef<Map<string, number>>(new Map())
    
    // Track current views to avoid stale closures
    const viewsRef = React.useRef(views)
    viewsRef.current = views
    
    // Config ref
    const configRef = React.useRef(config)
    configRef.current = config
    
    React.useEffect(() => {
        const container = containerRef.current
        if (!container) return
        
        let rafId: number
        
        const calculate = () => {
            const containerWidth = container.offsetWidth
            const cfg = configRef.current
            const currentViews = viewsRef.current
            const measured = measuredWidthsRef.current
            
            // Step 1: Measure current elements and store their widths
            for (const [key, elementConfig] of Object.entries(cfg)) {
                const ref = elementRefs[key as keyof T]
                const el = ref?.current
                if (el) {
                    const currentView = currentViews[key as keyof T]
                    const measureKey = `${key}:${currentView}`
                    const gap = typeof elementConfig.gap === 'function' 
                        ? elementConfig.gap(currentViews as Record<string, string>)
                        : (elementConfig.gap ?? 0)
                    const width = el.scrollWidth + gap
                    measured.set(measureKey, width)
                }
            }
            
            // Step 2: Sort elements by priority (lower priority collapses first)
            const sortedElements = Object.entries(cfg)
                .map(([key, el]) => ({ key, ...el }))
                .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            
            // Helper to get width for a view
            const getWidth = (key: string, view: string): number => {
                const measureKey = `${key}:${view}`
                return measured.get(measureKey) ?? 0
            }
            
            // Step 3: Start with most spacious views
            const newViews = {} as Record<string, string>
            for (const el of sortedElements) {
                newViews[el.key] = el.views[0] // Most spacious
            }
            
            // Step 4: Calculate total needed width
            let totalNeeded = sortedElements.reduce((sum, el) => {
                return sum + getWidth(el.key, newViews[el.key])
            }, 0)
            
            // Step 5: If too wide, collapse views starting with lowest priority
            if (totalNeeded > containerWidth) {
                for (const el of sortedElements) {
                    if (totalNeeded <= containerWidth) break
                    
                    const viewsArray = el.views
                    const currentViewIndex = viewsArray.indexOf(newViews[el.key])
                    
                    // Try progressively more compact views
                    for (let i = currentViewIndex + 1; i < viewsArray.length; i++) {
                        const moreCompactView = viewsArray[i]
                        const currentWidth = getWidth(el.key, newViews[el.key])
                        const compactWidth = getWidth(el.key, moreCompactView)
                        
                        // If we have a measurement, use it; otherwise try the view
                        if (compactWidth > 0) {
                            const savings = currentWidth - compactWidth
                            totalNeeded -= savings
                            newViews[el.key] = moreCompactView
                        } else {
                            // No measurement yet - switch to measure it
                            newViews[el.key] = moreCompactView
                            // Estimate some savings
                            totalNeeded -= currentWidth * 0.3
                        }
                        
                        if (totalNeeded <= containerWidth) break
                    }
                }
            }
            
            // Step 6: Only update if views actually changed
            const viewsChanged = Object.keys(newViews).some(
                key => newViews[key] !== currentViews[key as keyof T]
            )
            
            if (viewsChanged) {
                setViews(newViews as ResponsiveViews<T>)
            }
        }
        
        // Initial calculation (run twice to measure both states)
        calculate()
        // Second pass after a frame to catch measurements
        requestAnimationFrame(() => {
            calculate()
        })
        
        // Watch for size changes
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(calculate)
        })
        observer.observe(container)
        
        // Also observe all element refs for content changes
        for (const key of Object.keys(configRef.current)) {
            const ref = elementRefs[key as keyof T]
            if (ref?.current) {
                observer.observe(ref.current)
            }
        }
        
        return () => {
            cancelAnimationFrame(rafId)
            observer.disconnect()
        }
    }, [configKeys])
    
    return { views, containerRef, elementRefs }
}

// ==============================================================================
// SIMPLIFIED HOOK - For single elements with fixed thresholds
// ==============================================================================

/**
 * Simplified hook for a single element with multiple views
 * Uses fixed minWidth values (for simpler cases where measurement isn't needed)
 */
export interface ViewConfig {
    name: string
    minWidth: number
}

export function useResponsiveView<T extends ViewConfig[]>(viewConfigs: T) {
    const ref = React.useRef<HTMLElement>(null)
    const [view, setView] = React.useState<T[number]['name']>(viewConfigs[viewConfigs.length - 1].name)
    
    const configRef = React.useRef(viewConfigs)
    configRef.current = viewConfigs
    
    React.useEffect(() => {
        const element = ref.current
        if (!element) return
        
        let rafId: number
        
        const calculate = () => {
            const width = element.offsetWidth
            const configs = configRef.current
            
            // Find the most spacious view that fits
            for (const config of configs) {
                if (width >= config.minWidth) {
                    setView(config.name)
                    return
                }
            }
            
            // Fallback to most compact
            setView(configs[configs.length - 1].name)
        }
        
        calculate()
        
        const observer = new ResizeObserver(() => {
            cancelAnimationFrame(rafId)
            rafId = requestAnimationFrame(calculate)
        })
        observer.observe(element)
        
        return () => {
            cancelAnimationFrame(rafId)
            observer.disconnect()
        }
    }, [])
    
    return { view, ref }
}

