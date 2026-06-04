//
//  auth-noise-background.tsx
//  Argent
//
//  Created on 01 June 2026.
//  Description: Renders a lightweight animated character field behind authentication screens.
//
"use client"

import { useEffect, useRef } from 'react'

export function AuthNoiseBackground() {
    const backgroundRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let frame = 0
        let pointerX = window.innerWidth / 2
        let pointerY = window.innerHeight * 0.44

        const syncPointer = () => {
            frame = 0
            const node = backgroundRef.current

            if (!node) {
                return
            }

            node.style.setProperty('--auth-spotlight-x', `${pointerX}px`)
            node.style.setProperty('--auth-spotlight-y', `${pointerY}px`)
        }

        const queuePointerSync = (x: number, y: number) => {
            pointerX = x
            pointerY = y

            if (frame === 0) {
                frame = window.requestAnimationFrame(syncPointer)
            }
        }

        const handlePointerMove = (event: PointerEvent) => {
            queuePointerSync(event.clientX, event.clientY)
        }

        const handleResize = () => {
            queuePointerSync(window.innerWidth / 2, window.innerHeight * 0.44)
        }

        syncPointer()
        window.addEventListener('pointermove', handlePointerMove, { passive: true })
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('resize', handleResize)

            if (frame !== 0) {
                window.cancelAnimationFrame(frame)
            }
        }
    }, [])

    return (
        <div ref={backgroundRef} className="auth-noise-background" aria-hidden="true">
            <span className="auth-ascii-layer auth-ascii-layer-base" />
            <span className="auth-ascii-layer auth-ascii-layer-sweep" />
            <span className="auth-ascii-layer auth-ascii-layer-highlight" />
            <div className="auth-logo-morph auth-logo-morph-primary">
                <span className="auth-logo-mask auth-logo-mask-mark">
                    <span className="auth-logo-character-fill" />
                </span>
                <span className="auth-logo-mask auth-logo-mask-word">
                    <span className="auth-logo-character-fill" />
                </span>
            </div>
            <div className="auth-logo-morph auth-logo-morph-secondary">
                <span className="auth-logo-mask auth-logo-mask-mark">
                    <span className="auth-logo-character-fill" />
                </span>
                <span className="auth-logo-mask auth-logo-mask-word">
                    <span className="auth-logo-character-fill" />
                </span>
            </div>
        </div>
    )
}
