//
//  loading-screen.tsx
//  Argent
//
//  Created by hilario on 23 May 2026 at 20:28.
//  Description: Implements the Loading screen React component for Argent, encapsulating reusable
//  interface structure, state handling, and presentation logic for feature screens.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type * as React from "react"

const screenStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 2147483647,
    display: "flex",
    minHeight: "100vh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    contain: "layout paint style",
    isolation: "isolate",
}

const iconFrameStyle: React.CSSProperties = {
    position: "relative",
    height: "clamp(5rem,18vw,7.5rem)",
    width: "clamp(5.75rem,20vw,8.625rem)",
}

function ArgentLoadingMark({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="none"
            viewBox="0 0 151 131"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <mask id="argent-loading-icon-mask" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="-5" y="-4" width="161" height="142">
                    <path d="M151 0.273399H0V130.273H151V0.273399Z" fill="white" />
                    <path d="M0 130.273L151 2.2734" stroke="black" strokeWidth="15" />
                    <path d="M0 130.273L151 78.2734" stroke="black" strokeWidth="15" />
                </mask>
                <clipPath id="argent-loading-fill-clip" clipPathUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="0" height="131">
                        <animate
                            attributeName="width"
                            calcMode="spline"
                            dur="1.6s"
                            fill="freeze"
                            keySplines="0.65 0 0.35 1; 0.65 0 0.35 1"
                            keyTimes="0; 0.72; 1"
                            values="0; 151; 151"
                        />
                    </rect>
                </clipPath>
            </defs>
            <g mask="url(#argent-loading-icon-mask)" opacity="0.2">
                <path d="M0 130.273L75.214 0L150.428 130.273H0Z" fill="currentColor" />
            </g>
            <g mask="url(#argent-loading-icon-mask)" clipPath="url(#argent-loading-fill-clip)">
                <path d="M0 130.273L75.214 0L150.428 130.273H0Z" fill="currentColor" />
            </g>
        </svg>
    )
}

export function LoadingScreen({
    exiting = false,
}: {
    exiting?: boolean
}) {
    return (
        <div
            className={`fixed inset-0 z-[9999] flex min-h-screen items-center justify-center ${exiting ? "animate-argent-loading-out" : "animate-argent-loading-failsafe"}`}
            style={{
                ...screenStyle,
                pointerEvents: exiting ? "none" : "auto",
            }}
            role="status"
            aria-label="Loading"
        >
            <div
                className="relative h-[clamp(5rem,18vw,7.5rem)] w-[clamp(5.75rem,20vw,8.625rem)]"
                style={iconFrameStyle}
                aria-hidden="true"
            >
                <ArgentLoadingMark className="absolute inset-0 h-full w-full text-foreground" />
            </div>
            <span className="sr-only">Loading</span>
        </div>
    )
}
