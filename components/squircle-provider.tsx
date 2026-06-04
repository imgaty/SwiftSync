//
//  squircle-provider.tsx
//  Argent
//
//  Description: Provides measured continuous-corner rendering for shared squircle surfaces.
//
"use client"

import * as React from "react"

type ManagedSquircle = {
    key: string
}

type ResolvedSquircleConfig = {
    isCapsule: boolean
    radius: number
    smoothing: number
}

const SHAPE_CLASSES = [
    ".squircle-surface",
    "[data-squircle]",
    ".sq",
    ".sq-2",
    ".sq-4",
    ".sq-5",
    ".sq-sm",
    ".sq-md",
    ".sq-lg",
    ".sq-10",
    ".sq-xl",
    ".sq-12",
    ".sq-2xl",
    ".sq-radius-plus",
    ".sq-full",
    ".sq-l-md",
    ".sq-r-md",
    ".toaster [data-sonner-toast]",
]

const SQUIRCLE_SELECTOR = [
    ...SHAPE_CLASSES,
    '[class*="*:sq-"] > *',
].join(",")

const DEFAULT_SMOOTHING = 0.6
const CAPSULE_SMOOTHING = 1
const DEFAULT_RADIUS_GROWTH_DAMPING = 420
const AREA_RADIUS_RESPONSE = 320
const MINIMUM_RENDERABLE_RADIUS = 0.5
const WIKIPEDIA_SQUIRCLE_EXPONENT = 4
const CIRCULAR_EXPONENT = 2
const SUPERELLIPSE_SEGMENTS = 28

const OVERFLOW_ANCHOR_SLOTS = new Set(["alert", "badge", "button"])

function supportsNativeCornerShape() {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
    return CSS.supports("corner-shape", "squircle") || CSS.supports("corner-shape: squircle")
}

function supportsCssPathClip() {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
    const testPath = "path('M 0 0 L 1 0 L 1 1 Z')"
    return CSS.supports("clip-path", testPath) || CSS.supports("-webkit-clip-path", testPath)
}

function readNumber(value: string, fallback: number) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

function clampRadius(radius: number, width: number, height: number) {
    if (width <= 0 || height <= 0) return radius
    return Math.min(radius, Math.max(0, Math.min(width, height) / 2))
}

function roundRadius(radius: number) {
    return Math.round(radius * 100) / 100
}

function measuredRadius(baseRadius: number, scale: number, growthDamping: number, width: number, height: number) {
    if (baseRadius >= 9999) return clampRadius(baseRadius, width, height)
    if (width <= 0 || height <= 0) return baseRadius

    const lengthFromArea = Math.sqrt(width * height)
    const easedArea = 1 - Math.exp(-lengthFromArea / Math.max(1, growthDamping))
    const proportionalLift = Math.max(0, scale) * AREA_RADIUS_RESPONSE * easedArea

    return clampRadius(baseRadius + proportionalLift, width, height)
}

function writeMeasuredRadius(element: HTMLElement, radius: number) {
    const value = `${roundRadius(radius)}px`
    if (element.style.getPropertyValue("--sq-measured-r") === value) return
    element.style.setProperty("--sq-measured-r", value)
}

function clearMeasuredRadius(element: HTMLElement) {
    element.style.removeProperty("--sq-measured-r")
}

function hasDirectAbsoluteChild(element: HTMLElement) {
    for (const child of Array.from(element.children)) {
        if (child instanceof HTMLElement && child.classList.contains("absolute")) {
            return true
        }
    }

    return false
}

function allowsVisibleShapeOverflow(element: HTMLElement) {
    if (element.classList.contains("sq-overflow-visible") || element.classList.contains("overflow-visible")) {
        return true
    }

    const slot = element.getAttribute("data-slot")
    return slot !== null && OVERFLOW_ANCHOR_SLOTS.has(slot) && hasDirectAbsoluteChild(element)
}

function restoreNativeBorder(element: HTMLElement) {
    if (element.dataset.squircleNativeBorderHidden !== "true") return

    if (element.dataset.squircleHadInlineBorderColor === "true") {
        element.style.borderColor = element.dataset.squircleOriginalBorderColor ?? ""
    } else {
        element.style.removeProperty("border-color")
    }

    delete element.dataset.squircleHadInlineBorderColor
    delete element.dataset.squircleOriginalBorderColor
    delete element.dataset.squircleBorderColor
    delete element.dataset.squircleNativeBorderHidden
}

function restoreLegacyRuntimeStyles(element: HTMLElement) {
    const originalBg = element.dataset.squircleOriginalBg
    if (originalBg !== undefined) {
        if (element.dataset.squircleHadInlineBg === "true") {
            element.style.backgroundColor = originalBg
        } else {
            element.style.removeProperty("background-color")
        }
    }

    const originalBgImage = element.dataset.squircleOriginalBgImage
    if (originalBgImage !== undefined) {
        if (element.dataset.squircleHadInlineBgImage === "true") {
            element.style.backgroundImage = originalBgImage
        } else {
            element.style.removeProperty("background-image")
        }
    }

    const originalShadow = element.dataset.squircleOriginalShadow
    if (originalShadow !== undefined) {
        if (element.dataset.squircleHadInlineShadow === "true") {
            element.style.boxShadow = originalShadow
        } else {
            element.style.removeProperty("box-shadow")
        }
    }

    if (element.dataset.squircleSetPosition === "true") {
        element.style.removeProperty("position")
    }

    element.style.removeProperty("isolation")
    delete element.dataset.squircleOriginalBg
    delete element.dataset.squircleHadInlineBg
    delete element.dataset.squircleOriginalBgImage
    delete element.dataset.squircleHadInlineBgImage
    delete element.dataset.squircleOriginalShadow
    delete element.dataset.squircleHadInlineShadow
    delete element.dataset.squircleSetPosition
}

function readSquircleConfig(element: HTMLElement, width: number, height: number): ResolvedSquircleConfig | null {
    if (allowsVisibleShapeOverflow(element)) {
        clearMeasuredRadius(element)
        return null
    }

    const style = window.getComputedStyle(element)
    const fallbackRadius = readNumber(style.getPropertyValue("--sq-r"), 0)
    const baseRadius = readNumber(style.getPropertyValue("--sq-base-r"), fallbackRadius)
    const scale = readNumber(style.getPropertyValue("--sq-scale"), 0)
    const growthDamping = readNumber(style.getPropertyValue("--sq-growth-damping"), DEFAULT_RADIUS_GROWTH_DAMPING)
    const isCapsule = element.classList.contains("sq-full") || baseRadius >= 9999
    const radius = measuredRadius(baseRadius, scale, growthDamping, width, height)
    const smoothing = isCapsule
        ? CAPSULE_SMOOTHING
        : readNumber(style.getPropertyValue("--sq-q"), DEFAULT_SMOOTHING)

    if (radius <= MINIMUM_RENDERABLE_RADIUS) {
        if (element.hasAttribute("data-squircle")) {
            const dataRadius = readNumber(element.getAttribute("data-squircle-radius") ?? "", 20)
            const dataSmoothing = readNumber(element.getAttribute("data-squircle-smoothing") ?? "", DEFAULT_SMOOTHING)
            const measuredDataRadius = measuredRadius(dataRadius, scale, growthDamping, width, height)

            writeMeasuredRadius(element, measuredDataRadius)
            return {
                isCapsule: false,
                radius: measuredDataRadius,
                smoothing: dataSmoothing,
            }
        }

        clearMeasuredRadius(element)
        return null
    }

    writeMeasuredRadius(element, radius)

    return {
        isCapsule,
        radius,
        smoothing,
    }
}

function superellipsePoint(centerX: number, centerY: number, radius: number, angle: number, exponent: number) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const power = 2 / exponent

    return {
        x: centerX + Math.sign(cos) * radius * Math.abs(cos) ** power,
        y: centerY + Math.sign(sin) * radius * Math.abs(sin) ** power,
    }
}

function superellipseOutwardNormal(angle: number, exponent: number) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const normalPower = 2 * Math.max(0, exponent - 1) / Math.max(1, exponent)
    const x = Math.sign(cos) * Math.abs(cos) ** normalPower
    const y = Math.sign(sin) * Math.abs(sin) ** normalPower
    const length = Math.hypot(x, y)

    if (length <= 0) return { x: 0, y: 0 }

    return {
        x: x / length,
        y: y / length,
    }
}

function offsetSuperellipsePoint(centerX: number, centerY: number, radius: number, angle: number, exponent: number, inset: number) {
    const point = superellipsePoint(centerX, centerY, radius, angle, exponent)

    if (inset <= 0) return point

    const normal = superellipseOutwardNormal(angle, exponent)

    return {
        x: point.x - normal.x * inset,
        y: point.y - normal.y * inset,
    }
}

function formatPoint(value: number) {
    return String(roundRadius(value))
}

function smoothingToExponent(smoothing: number, isCapsule: boolean) {
    if (isCapsule) return CIRCULAR_EXPONENT

    const normalized = Math.max(0, smoothing) / DEFAULT_SMOOTHING
    return Math.max(CIRCULAR_EXPONENT, CIRCULAR_EXPONENT + normalized * (WIKIPEDIA_SQUIRCLE_EXPONENT - CIRCULAR_EXPONENT))
}

function superellipsePath(width: number, height: number, radius: number, exponent: number, inset = 0) {
    const points = superellipseBoundaryPoints(width, height, radius, exponent, inset)
    return pointsToPath(points)
}

function superellipseRingPath(width: number, height: number, radius: number, exponent: number, inset: number) {
    const outerPoints = superellipseBoundaryPoints(width, height, radius, exponent)
    const innerPoints = superellipseBoundaryPoints(width, height, radius, exponent, inset).reverse()

    if (outerPoints.length === 0 || innerPoints.length === 0) return ""

    return `${pointsToPath(outerPoints)} ${pointsToPath(innerPoints)}`
}

function superellipseBoundaryPoints(width: number, height: number, radius: number, exponent: number, inset = 0) {
    const safeInset = Math.max(0, Math.min(inset, Math.min(width, height) / 2))
    const left = 0
    const top = 0
    const right = width
    const bottom = height
    const innerLeft = safeInset
    const innerTop = safeInset
    const innerRight = width - safeInset
    const innerBottom = height - safeInset

    if (innerRight <= innerLeft || innerBottom <= innerTop) return []

    const resolvedRadius = clampRadius(Math.max(0, radius), width, height)

    if (resolvedRadius <= MINIMUM_RENDERABLE_RADIUS) {
        return [
            { x: innerLeft, y: innerTop },
            { x: innerRight, y: innerTop },
            { x: innerRight, y: innerBottom },
            { x: innerLeft, y: innerBottom },
        ]
    }

    const r = resolvedRadius
    const topLeft = { x: left + r, y: top + r }
    const topRight = { x: right - r, y: top + r }
    const bottomRight = { x: right - r, y: bottom - r }
    const bottomLeft = { x: left + r, y: bottom - r }
    const points = [
        offsetSuperellipsePoint(topLeft.x, topLeft.y, r, -Math.PI / 2, exponent, safeInset),
        offsetSuperellipsePoint(topRight.x, topRight.y, r, -Math.PI / 2, exponent, safeInset),
    ]

    appendCornerPointObjects(points, topRight.x, topRight.y, r, -Math.PI / 2, 0, exponent, safeInset)
    points.push(offsetSuperellipsePoint(bottomRight.x, bottomRight.y, r, 0, exponent, safeInset))
    appendCornerPointObjects(points, bottomRight.x, bottomRight.y, r, 0, Math.PI / 2, exponent, safeInset)
    points.push(offsetSuperellipsePoint(bottomLeft.x, bottomLeft.y, r, Math.PI / 2, exponent, safeInset))
    appendCornerPointObjects(points, bottomLeft.x, bottomLeft.y, r, Math.PI / 2, Math.PI, exponent, safeInset)
    points.push(offsetSuperellipsePoint(topLeft.x, topLeft.y, r, Math.PI, exponent, safeInset))
    appendCornerPointObjects(points, topLeft.x, topLeft.y, r, Math.PI, Math.PI * 1.5, exponent, safeInset)

    return points
}

function appendCornerPointObjects(
    points: Array<{ x: number; y: number }>,
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    exponent: number,
    inset = 0,
) {
    for (let index = 1; index <= SUPERELLIPSE_SEGMENTS; index++) {
        const progress = index / SUPERELLIPSE_SEGMENTS
        const angle = startAngle + (endAngle - startAngle) * progress
        points.push(offsetSuperellipsePoint(centerX, centerY, radius, angle, exponent, inset))
    }
}

function pointsToPath(points: Array<{ x: number; y: number }>) {
    if (points.length === 0) return ""

    const [first, ...rest] = points
    const commands = [`M ${formatPoint(first.x)} ${formatPoint(first.y)}`]

    rest.forEach((point) => {
        commands.push(`L ${formatPoint(point.x)} ${formatPoint(point.y)}`)
    })

    commands.push("Z")
    return commands.join(" ")
}

function applyFallbackSquircle(element: HTMLElement, config: ResolvedSquircleConfig, width: number, height: number) {
    const exponent = smoothingToExponent(config.smoothing, config.isCapsule)
    const path = superellipsePath(width, height, config.radius, exponent)

    if (!path) return

    const clipPath = `path('${path}')`
    element.style.setProperty("clip-path", clipPath)
    element.style.setProperty("-webkit-clip-path", clipPath)
}

function hasSquircleBorder(element: HTMLElement) {
    return (
        element.classList.contains("sq-border-muted") ||
        element.classList.contains("sq-border-soft") ||
        element.classList.contains("sq-border-strong")
    )
}

function clearSquircleBorderClip(element: HTMLElement) {
    element.style.removeProperty("--sq-border-clip-path")
    element.removeAttribute("data-squircle-border-runtime")
}

function applySquircleBorderClip(element: HTMLElement, config: ResolvedSquircleConfig, width: number, height: number) {
    if (!hasSquircleBorder(element) || !supportsCssPathClip()) {
        clearSquircleBorderClip(element)
        return
    }

    const style = window.getComputedStyle(element)
    const borderWidth = readNumber(style.getPropertyValue("--sq-border-width"), readNumber(style.borderTopWidth, 1))
    const exponent = smoothingToExponent(config.smoothing, config.isCapsule)
    const path = superellipseRingPath(width, height, config.radius, exponent, borderWidth)

    if (!path) {
        clearSquircleBorderClip(element)
        return
    }

    const clipPath = `path('${path}')`

    if (element.style.getPropertyValue("--sq-border-clip-path") !== clipPath) {
        element.style.setProperty("--sq-border-clip-path", clipPath)
    }

    element.setAttribute("data-squircle-border-runtime", "path")
}

function clearLegacyRuntimeArtifacts() {
    document
        .querySelectorAll<HTMLElement>("[data-squircle-runtime], [data-squircle-border-runtime]")
        .forEach((element) => {
            element.style.removeProperty("clip-path")
            element.style.removeProperty("-webkit-clip-path")
            clearMeasuredRadius(element)
            clearSquircleBorderClip(element)
            restoreNativeBorder(element)
            restoreLegacyRuntimeStyles(element)

            if (element.dataset.squircleSetBorderPosition === "true") {
                element.style.removeProperty("position")
                delete element.dataset.squircleSetBorderPosition
            }

            element.removeAttribute("data-squircle-runtime")
            element.removeAttribute("data-squircle-border-runtime")
        })

        document
        .querySelectorAll(".squircle-border-overlay, .cornerkit-border")
        .forEach((element) => element.remove())
}

export function SquircleProvider() {
    React.useEffect(() => {
        clearLegacyRuntimeArtifacts()

        if (supportsNativeCornerShape()) {
            document.documentElement.dataset.squircleRenderer = "native"
            const measured = new Set<HTMLElement>()
            let frame = 0

            const scheduleScan = () => {
                if (frame) return
                frame = window.requestAnimationFrame(scan)
            }

            const resizeObserver = new ResizeObserver(scheduleScan)

            const remove = (element: HTMLElement) => {
                if (!measured.has(element)) return
                clearMeasuredRadius(element)
                clearSquircleBorderClip(element)
                resizeObserver.unobserve(element)
                measured.delete(element)
            }

            const apply = (element: HTMLElement) => {
                if (!element.isConnected) {
                    remove(element)
                    return
                }

                const config = readSquircleConfig(element, element.offsetWidth, element.offsetHeight)
                if (!config) {
                    remove(element)
                    return
                }

                if (!measured.has(element)) {
                    resizeObserver.observe(element)
                    measured.add(element)
                }

                applySquircleBorderClip(element, config, element.offsetWidth, element.offsetHeight)
            }

            function scan() {
                frame = 0
                const candidates = new Set<HTMLElement>()

                document.querySelectorAll(SQUIRCLE_SELECTOR).forEach((element) => {
                    if (element instanceof HTMLElement) candidates.add(element)
                })

                measured.forEach((element) => candidates.add(element))
                candidates.forEach(apply)
            }

            const observer = new MutationObserver(scheduleScan)

            observer.observe(document.body, {
                attributes: true,
                attributeFilter: [
                    "class",
                    "style",
                    "data-squircle",
                    "data-squircle-radius",
                    "data-squircle-smoothing",
                ],
                childList: true,
                subtree: true,
            })

            window.addEventListener("resize", scheduleScan)
            scan()

            return () => {
                if (frame) window.cancelAnimationFrame(frame)
                observer.disconnect()
                resizeObserver.disconnect()
                window.removeEventListener("resize", scheduleScan)
                measured.forEach((element) => {
                    clearMeasuredRadius(element)
                    clearSquircleBorderClip(element)
                })
                measured.clear()

                if (document.documentElement.dataset.squircleRenderer === "native") {
                    delete document.documentElement.dataset.squircleRenderer
                }
            }
        }

        document.documentElement.dataset.squircleRenderer = "path"

        const managed = new Map<HTMLElement, ManagedSquircle>()
        let frame = 0

        const scheduleScan = () => {
            if (frame) return
            frame = window.requestAnimationFrame(scan)
        }

        const resizeObserver = new ResizeObserver(scheduleScan)

        const remove = (element: HTMLElement) => {
            if (!managed.has(element)) return

            element.style.removeProperty("clip-path")
            element.style.removeProperty("-webkit-clip-path")
            clearMeasuredRadius(element)
            clearSquircleBorderClip(element)
            element.removeAttribute("data-squircle-runtime")
            resizeObserver.unobserve(element)
            managed.delete(element)
        }

        const apply = (element: HTMLElement) => {
            if (!element.isConnected) {
                remove(element)
                return
            }

            const width = element.offsetWidth
            const height = element.offsetHeight
            const config = readSquircleConfig(element, width, height)

            if (!config) {
                remove(element)
                return
            }

            const current = managed.get(element)
            const key = `${config.radius}:${config.smoothing}:${config.isCapsule}:${width}:${height}`

            try {
                if (!current || current.key !== key) {
                    applyFallbackSquircle(element, config, width, height)
                    element.setAttribute("data-squircle-runtime", "path")
                }

                applySquircleBorderClip(element, config, width, height)

                if (!current) {
                    resizeObserver.observe(element)
                }

                managed.set(element, { key })
            } catch {
                remove(element)
            }
        }

        function scan() {
            frame = 0
            const candidates = new Set<HTMLElement>()

            document.querySelectorAll(SQUIRCLE_SELECTOR).forEach((element) => {
                if (element instanceof HTMLElement) candidates.add(element)
            })

            managed.forEach((_, element) => candidates.add(element))
            candidates.forEach(apply)
        }

        const observer = new MutationObserver(scheduleScan)

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: [
                "class",
                "style",
                "data-squircle",
                "data-squircle-radius",
                "data-squircle-smoothing",
            ],
            childList: true,
            subtree: true,
        })

        window.addEventListener("resize", scheduleScan)
        scan()

        return () => {
            if (frame) window.cancelAnimationFrame(frame)
            observer.disconnect()
            resizeObserver.disconnect()
            window.removeEventListener("resize", scheduleScan)
            managed.forEach((_, element) => {
                element.style.removeProperty("clip-path")
                element.style.removeProperty("-webkit-clip-path")
                clearMeasuredRadius(element)
                clearSquircleBorderClip(element)
            })
            managed.clear()

            if (document.documentElement.dataset.squircleRenderer === "path") {
                delete document.documentElement.dataset.squircleRenderer
            }
        }
    }, [])

    return null
}
