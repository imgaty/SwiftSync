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

const iconMaskStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    WebkitMaskImage: "url('/icon-black.svg')",
    WebkitMaskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskImage: "url('/icon-black.svg')",
    maskPosition: "center",
    maskRepeat: "no-repeat",
    maskSize: "contain",
}

export function LoadingScreen({
    exiting = false,
    filling = false,
}: {
    exiting?: boolean
    filling?: boolean
}) {
    return (
        <div
            className={`fixed inset-0 z-[9999] flex min-h-screen items-center justify-center ${exiting ? "animate-argent-loading-out" : ""}`}
            style={screenStyle}
            role="status"
            aria-label="Loading"
        >
            <div
                className="relative h-[clamp(5rem,18vw,7.5rem)] w-[clamp(5.75rem,20vw,8.625rem)]"
                style={iconFrameStyle}
                aria-hidden="true"
            >
                <div
                    className="absolute inset-0"
                    style={{ ...iconMaskStyle, backgroundColor: "color-mix(in srgb, var(--foreground) 20%, transparent)" }}
                />
                <div
                    className={`argent-icon-fill-layer absolute inset-0 ${filling ? "animate-argent-icon-fill" : ""}`}
                    style={{
                        ...iconMaskStyle,
                        backgroundColor: "var(--foreground)",
                        ...(filling
                            ? null
                            : {
                                transform: "scaleX(0)",
                            }),
                    }}
                />
            </div>
            <span className="sr-only">Loading</span>
        </div>
    )
}
