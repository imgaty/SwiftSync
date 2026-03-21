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

    const showLeftGradient = isOverflowing && scrollPosition > 1
    const showRightGradient = isOverflowing && scrollPosition < maxScroll - 1

    return (
        <div 
            ref={containerRef} 
            className={cn("relative overflow-hidden", center && !isOverflowing && "flex justify-center", className)}
        >
            {isOverflowing && (
                <>
                    <div 
                        className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none transition-opacity duration-150 bg-linear-to-r from-background to-transparent"
                        style={{ width: fadeWidth, opacity: showLeftGradient ? 1 : 0 }}
                    />
                    <div 
                        className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none transition-opacity duration-150 bg-linear-to-l from-background to-transparent"
                        style={{ width: fadeWidth, opacity: showRightGradient ? 1 : 0 }}
                    />
                </>
            )}
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
export function AutoScrollProvider({ children }: { children: React.ReactNode }) {
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

        const SPEED = 30
        const PAUSE_DURATION = 2000
        const FADE_WIDTH = 20

        const setupElement = (el: HTMLElement) => {
            if (scrollStates.has(el)) return

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

            const leftGrad = document.createElement('div')
            leftGrad.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:${FADE_WIDTH}px;z-index:10;pointer-events:none;background:linear-gradient(to right,var(--background),transparent);opacity:0;transition:opacity 150ms;`
            
            const rightGrad = document.createElement('div')
            rightGrad.style.cssText = `position:absolute;right:0;top:0;bottom:0;width:${FADE_WIDTH}px;z-index:10;pointer-events:none;background:linear-gradient(to left,var(--background),transparent);opacity:0;transition:opacity 150ms;`
            
            wrapper.appendChild(leftGrad)
            wrapper.appendChild(rightGrad)

            const checkAndAnimate = () => {
                const containerWidth = wrapper.clientWidth
                const contentWidth = content.scrollWidth
                const isOverflowing = contentWidth > containerWidth

                if (!isOverflowing) {
                    content.style.transform = 'translateX(0)'
                    leftGrad.style.opacity = '0'
                    rightGrad.style.opacity = '0'
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
                        leftGrad.style.opacity = state.position > 1 ? '1' : '0'
                        rightGrad.style.opacity = state.position < state.maxScroll - 1 ? '1' : '0'

                        state.animationId = requestAnimationFrame(animate)
                    }

                    scrollStates.get(el)!.animationId = requestAnimationFrame(animate)
                } else {
                    scrollStates.get(el)!.maxScroll = maxScroll
                }
            }

            // Initial check
            setTimeout(checkAndAnimate, 100)

            // Watch for resize
            const resizeObserver = new ResizeObserver(checkAndAnimate)
            resizeObserver.observe(wrapper)
            resizeObserver.observe(content)

            ;(el as any)._autoScrollCleanup = () => {
                resizeObserver.disconnect()
                const state = scrollStates.get(el)
                if (state?.animationId) cancelAnimationFrame(state.animationId)
                scrollStates.delete(el)
            }
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
            })
        })

        // Setup existing elements
        document.querySelectorAll('.auto-scroll').forEach((el) => {
            if (el instanceof HTMLElement) setupElement(el)
        })

        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            observer.disconnect()
            scrollStates.forEach((state, el) => {
                if (state.animationId) cancelAnimationFrame(state.animationId)
                ;(el as any)._autoScrollCleanup?.()
            })
        }
    }, [])

    return <>{children}</>
}
