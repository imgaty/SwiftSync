//
//  overflow-scroll.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Overflow scroll UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OverflowScrollProps {
    children: React.ReactNode
    className?: string
    speed?: number // pixels per second
    pauseDuration?: number // ms to pause at ends
    fadeWidth?: number // gradient width in pixels
    center?: boolean // center content when not overflowing
}

export function OverflowScroll({ 
    children, 
    className,
    speed = 30,
    pauseDuration = 2000,
    fadeWidth = 20,
    center = false
}: OverflowScrollProps) {
    const containerRef = React.useRef<HTMLDivElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [isOverflowing, setIsOverflowing] = React.useState(false)
    const [scrollPosition, setScrollPosition] = React.useState(0)
    const [maxScroll, setMaxScroll] = React.useState(0)
    const animationRef = React.useRef<number | null>(null)
    const directionRef = React.useRef<'forward' | 'backward'>('forward')
    const pauseTimeRef = React.useRef<number>(0)
    const isPausedRef = React.useRef(true)

    // Check for overflow and measure
    React.useEffect(() => {
        const container = containerRef.current
        const content = contentRef.current
        if (!container || !content) return

        const checkOverflow = () => {
            const containerWidth = container.clientWidth
            const contentWidth = content.scrollWidth
            const overflow = contentWidth > containerWidth
            setIsOverflowing(overflow)
            setMaxScroll(overflow ? contentWidth - containerWidth : 0)
            if (!overflow) {
                setScrollPosition(0)
                directionRef.current = 'forward'
            }
        }

        const timeout = setTimeout(checkOverflow, 50)
        
        const resizeObserver = new ResizeObserver(checkOverflow)
        resizeObserver.observe(container)
        resizeObserver.observe(content)

        return () => {
            clearTimeout(timeout)
            resizeObserver.disconnect()
        }
    }, [children])

    // Animation using requestAnimationFrame
    React.useEffect(() => {
        if (!isOverflowing || maxScroll <= 0) return

        let lastTime = 0
        isPausedRef.current = true
        pauseTimeRef.current = performance.now()
        directionRef.current = 'forward'
        setScrollPosition(0)
        
        const animate = (currentTime: number) => {
            if (!lastTime) lastTime = currentTime
            const deltaTime = currentTime - lastTime
            lastTime = currentTime

            if (isPausedRef.current) {
                if (currentTime - pauseTimeRef.current >= pauseDuration) {
                    isPausedRef.current = false
                }
                animationRef.current = requestAnimationFrame(animate)
                return
            }

            setScrollPosition(prev => {
                const delta = (speed * deltaTime) / 1000
                let newPosition: number

                if (directionRef.current === 'forward') {
                    newPosition = prev + delta
                    if (newPosition >= maxScroll) {
                        newPosition = maxScroll
                        directionRef.current = 'backward'
                        isPausedRef.current = true
                        pauseTimeRef.current = currentTime
                    }
                } else {
                    newPosition = prev - delta
                    if (newPosition <= 0) {
                        newPosition = 0
                        directionRef.current = 'forward'
                        isPausedRef.current = true
                        pauseTimeRef.current = currentTime
                    }
                }

                return newPosition
            })

            animationRef.current = requestAnimationFrame(animate)
        }

        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [isOverflowing, maxScroll, speed, pauseDuration])

    const maskImage = React.useMemo(() => {
        if (!isOverflowing) return undefined
        const fadeLeft = scrollPosition > 1
        const fadeRight = scrollPosition < maxScroll - 1
        const l = fadeLeft ? `transparent, black ${fadeWidth}px` : 'black, black 0px'
        const r = fadeRight ? `black calc(100% - ${fadeWidth}px), transparent` : 'black 100%, black'
        return `linear-gradient(to right, ${l}, ${r})`
    }, [isOverflowing, scrollPosition, maxScroll, fadeWidth])

    return (
        <div 
            ref={containerRef} 
            className={cn("relative overflow-hidden", center && !isOverflowing && "flex justify-center", className)}
            style={{ maskImage, WebkitMaskImage: maskImage }}
        >
            <div 
                ref={contentRef}
                className={cn("whitespace-nowrap will-change-transform", isOverflowing ? "inline-block" : "inline-flex")}
                style={{ transform: isOverflowing ? `translateX(-${scrollPosition}px)` : undefined }}
            >
                {children}
            </div>
        </div>
    )
}

// Universal auto-scroll: Add class "auto-scroll" to any parent element
// and all overflowing children will automatically animate
export function AutoScrollProvider({ children }: { children?: React.ReactNode }) {
    React.useEffect(() => {
        const scrollStates = new Map<HTMLElement, {
            animationId: number | null
            direction: 'forward' | 'backward'
            position: number
            maxScroll: number
            isPaused: boolean
            pauseStart: number
            lastTime: number
        }>()
        const cleanupByElement = new Map<HTMLElement, () => void>()

        const SPEED = 30
        const PAUSE_DURATION = 2000
        const FADE_WIDTH = 20

        const cleanupElement = (el: HTMLElement) => {
            const cleanup = cleanupByElement.get(el)
            if (!cleanup) return
            cleanup()
            cleanupByElement.delete(el)
        }

        const cleanupSubtree = (node: Node) => {
            if (!(node instanceof HTMLElement)) return

            if (node.classList.contains('auto-scroll')) {
                cleanupElement(node)
            }

            node.querySelectorAll('.auto-scroll').forEach((el) => {
                if (el instanceof HTMLElement) cleanupElement(el)
            })
        }

        const setupElement = (el: HTMLElement) => {
            if (cleanupByElement.has(el)) return

            const wrapper = document.createElement('div')
            wrapper.className = 'auto-scroll-wrapper'
            wrapper.style.cssText = 'position:relative;overflow:hidden;width:100%;'
            
            const content = document.createElement('div')
            content.className = 'auto-scroll-content'
            content.style.cssText = 'display:inline-block;white-space:nowrap;will-change:transform;'
            
            // Move children to content wrapper
            while (el.firstChild) {
                content.appendChild(el.firstChild)
            }
            
            wrapper.appendChild(content)
            el.appendChild(wrapper)
            el.style.overflow = 'hidden'

            const updateMask = (position: number, max: number) => {
                const fadeLeft = position > 1
                const fadeRight = position < max - 1
                const l = fadeLeft ? `transparent, black ${FADE_WIDTH}px` : 'black, black 0px'
                const r = fadeRight ? `black calc(100% - ${FADE_WIDTH}px), transparent` : 'black 100%, black'
                const mask = `linear-gradient(to right, ${l}, ${r})`
                wrapper.style.maskImage = mask
                wrapper.style.webkitMaskImage = mask
            }

            const checkAndAnimate = () => {
                if (!el.isConnected) {
                    cleanupElement(el)
                    return
                }

                const containerWidth = wrapper.clientWidth
                const contentWidth = content.scrollWidth
                const isOverflowing = contentWidth > containerWidth

                if (!isOverflowing) {
                    content.style.transform = 'translateX(0)'
                    wrapper.style.maskImage = ''
                    wrapper.style.webkitMaskImage = ''
                    const state = scrollStates.get(el)
                    if (state?.animationId) {
                        cancelAnimationFrame(state.animationId)
                    }
                    scrollStates.delete(el)
                    return
                }

                const maxScroll = contentWidth - containerWidth

                if (!scrollStates.has(el)) {
                    scrollStates.set(el, {
                        animationId: null,
                        direction: 'forward',
                        position: 0,
                        maxScroll,
                        isPaused: true,
                        pauseStart: performance.now(),
                        lastTime: 0
                    })

                    const animate = (currentTime: number) => {
                        const state = scrollStates.get(el)
                        if (!state) return

                        if (!state.lastTime) state.lastTime = currentTime
                        const deltaTime = currentTime - state.lastTime
                        state.lastTime = currentTime

                        if (state.isPaused) {
                            if (currentTime - state.pauseStart >= PAUSE_DURATION) {
                                state.isPaused = false
                            }
                            state.animationId = requestAnimationFrame(animate)
                            return
                        }

                        const delta = (SPEED * deltaTime) / 1000

                        if (state.direction === 'forward') {
                            state.position += delta
                            if (state.position >= state.maxScroll) {
                                state.position = state.maxScroll
                                state.direction = 'backward'
                                state.isPaused = true
                                state.pauseStart = currentTime
                            }
                        } else {
                            state.position -= delta
                            if (state.position <= 0) {
                                state.position = 0
                                state.direction = 'forward'
                                state.isPaused = true
                                state.pauseStart = currentTime
                            }
                        }

                        content.style.transform = `translateX(-${state.position}px)`
                        updateMask(state.position, state.maxScroll)

                        state.animationId = requestAnimationFrame(animate)
                    }

                    scrollStates.get(el)!.animationId = requestAnimationFrame(animate)
                } else {
                    scrollStates.get(el)!.maxScroll = maxScroll
                }
            }

            // Initial check
            let initialCheckTimer: ReturnType<typeof setTimeout> | null = setTimeout(checkAndAnimate, 100)

            // Watch for resize
            const resizeObserver = new ResizeObserver(checkAndAnimate)
            resizeObserver.observe(wrapper)
            resizeObserver.observe(content)

            cleanupByElement.set(el, () => {
                if (initialCheckTimer) {
                    clearTimeout(initialCheckTimer)
                    initialCheckTimer = null
                }
                resizeObserver.disconnect()
                const state = scrollStates.get(el)
                if (state?.animationId) cancelAnimationFrame(state.animationId)
                scrollStates.delete(el)
            })
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (node.classList.contains('auto-scroll')) {
                            setupElement(node)
                        }
                        node.querySelectorAll('.auto-scroll').forEach((el) => {
                            if (el instanceof HTMLElement) setupElement(el)
                        })
                    }
                })
                mutation.removedNodes.forEach(cleanupSubtree)
            })
        })

        // Setup existing elements
        document.querySelectorAll('.auto-scroll').forEach((el) => {
            if (el instanceof HTMLElement) setupElement(el)
        })

        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            observer.disconnect()
            Array.from(cleanupByElement.keys()).forEach(cleanupElement)
            scrollStates.forEach((state) => {
                if (state.animationId) cancelAnimationFrame(state.animationId)
            })
            scrollStates.clear()
            cleanupByElement.clear()
        }
    }, [])

    return children ? <>{children}</> : null
}
