//
//  UDS.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared UDS surface styling for Argent.
//  Last changed by hilario on 31 May 2026 at 17:20.
//
import type { ClassValue } from "clsx"

import { cn } from "@/lib/utils"

const UDS_PANEL_SHADOW =
    "shadow-[0_10px_28px_rgba(0,0,0,0.14),inset_0_0.5px_0_rgba(255,255,255,0.34)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_0.5px_0_rgba(255,255,255,0.18)]"
const UDS_CARD_SURFACE_SHADOW =
    "shadow-[0_10px_32px_rgba(8,8,8,0.055),inset_0_0.5px_0_rgba(255,255,255,0.34)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.24),inset_0_0.5px_0_rgba(255,255,255,0.16)]"
const UDS_CARD_FLAT_SHADOW = "shadow-none"

const UDS_BORDER_CLASSES = {
    muted: "border border-border",
    soft: "border border-border",
    strong: "border border-border",
} as const

const UDS_RADIUS_CLASSES = {
    none: "sq-none",
    sm: "sq-sm",
    md: "sq-md",
    lg: "sq-lg",
    xl: "sq-xl",
    normal: "sq-xl",
    "2xl": "sq-2xl",
    big: "sq-2xl",
    full: "sq-full",
} as const

const UDS_BACKGROUND_CLASSES = {
    glass: "bg-[color:color-mix(in_srgb,var(--background)_18%,transparent)]",
    modal: "bg-white/[0.96] dark:bg-black/[0.94]",
    subtle: "bg-[color:color-mix(in_srgb,var(--background)_10%,transparent)]",
    surface: "bg-[color:color-mix(in_srgb,var(--background)_14%,transparent)]",
    elevated: "bg-[color:color-mix(in_srgb,var(--background)_18%,transparent)]",
    raised: "bg-primary/[0.08]",
    input: "bg-[color:color-mix(in_srgb,var(--background)_14%,transparent)]",
} as const

const UDS_SHADOW_CLASSES = {
    subtle: "shadow-[0_6px_18px_rgba(8,8,8,0.045),inset_0_0.5px_0_rgba(255,255,255,0.30)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18),inset_0_0.5px_0_rgba(255,255,255,0.10)]",
    panel: UDS_PANEL_SHADOW,
    card: UDS_CARD_SURFACE_SHADOW,
} as const

const UDS_BLUR_CLASS = "uds-backdrop"

const UDS_BORDER_HOVER =
    "hover:border-border"

const UDS_TEXT_CLASSES = {
    caption: "text-xs font-medium text-muted-foreground",
    data: "text-sm leading-snug",
    iconSm: "size-3.5",
    icon: "size-4",
    iconLg: "size-5",
    value: "text-xl font-semibold leading-none tracking-normal text-foreground tabular-nums",
} as const

const UDS_SEMANTIC_BADGE_CLASSES = {
    accent: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    neutral: "border-border bg-neutral-500/10 text-neutral-500 dark:text-neutral-400",
    positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const

const UDS_STAT_CARD_TONE_CLASSES = {
    accent: {
        card: "",
        glow: "hidden",
        icon: "text-purple-600 dark:text-purple-400",
        line: "bg-purple-500/70",
        meta: "text-purple-700/80 dark:text-purple-300/85",
        value: "text-purple-700 dark:text-purple-300",
    },
    info: {
        card: "",
        glow: "hidden",
        icon: "text-blue-600 dark:text-blue-400",
        line: "bg-blue-500/70",
        meta: "text-blue-700/80 dark:text-blue-300/85",
        value: "text-blue-700 dark:text-blue-300",
    },
    negative: {
        card: "",
        glow: "hidden",
        icon: "text-red-600 dark:text-red-400",
        line: "bg-red-500/70",
        meta: "text-red-700/80 dark:text-red-300/85",
        value: "text-red-700 dark:text-red-300",
    },
    neutral: {
        card: "",
        glow: "hidden",
        icon: "text-muted-foreground",
        line: "bg-neutral-400/60",
        meta: "text-muted-foreground",
        value: "text-foreground",
    },
    positive: {
        card: "",
        glow: "hidden",
        icon: "text-emerald-600 dark:text-emerald-400",
        line: "bg-emerald-500/70",
        meta: "text-emerald-700/80 dark:text-emerald-300/85",
        value: "text-emerald-700 dark:text-emerald-300",
    },
    warning: {
        card: "",
        glow: "hidden",
        icon: "text-amber-600 dark:text-amber-400",
        line: "bg-amber-500/70",
        meta: "text-amber-700/80 dark:text-amber-300/85",
        value: "text-amber-700 dark:text-amber-300",
    },
} as const

export type UDSRadius = keyof typeof UDS_RADIUS_CLASSES
export type UDSBackground = boolean | "none" | keyof typeof UDS_BACKGROUND_CLASSES
export type UDSBorder = boolean | "none" | keyof typeof UDS_BORDER_CLASSES
export type UDSShadow = boolean | "none" | "flat" | keyof typeof UDS_SHADOW_CLASSES
export type UDSBlur = boolean

export type UDSSurfaceOptions = {
    background?: UDSBackground
    blur?: UDSBlur
    border?: UDSBorder
    className?: ClassValue
    focus?: boolean
    isolate?: boolean
    overflow?: boolean
    padding?: boolean
    radius?: UDSRadius
    shadow?: UDSShadow
    spotlight?: boolean
    text?: boolean
    zIndex?: boolean | "z-50" | "z-[900]" | "z-[999]" | "z-[1000]" | "z-[1100]" | "z-[9999]"
}

function backgroundClass(background: UDSBackground = "glass") {
    if (background === false || background === "none") return null
    return UDS_BACKGROUND_CLASSES[background === true ? "glass" : background]
}

function borderClass(border: UDSBorder = "soft") {
    if (border === false || border === "none") return "border-0"
    return UDS_BORDER_CLASSES[border === true ? "soft" : border]
}

function shadowClass(shadow: UDSShadow = "panel") {
    if (shadow === false || shadow === "none") return UDS_CARD_FLAT_SHADOW
    if (shadow === "flat") return UDS_CARD_FLAT_SHADOW
    return UDS_SHADOW_CLASSES[shadow === true ? "panel" : shadow]
}

function blurClass(blur: UDSBlur) {
    if (!blur) return null
    return UDS_BLUR_CLASS
}

export function udsSurface(options: UDSSurfaceOptions = {}) {
    const {
        background = "glass",
        blur = false,
        border = "soft",
        className,
        focus = false,
        isolate = true,
        overflow = true,
        padding = false,
        radius = "xl",
        shadow = "panel",
        spotlight = false,
        text = false,
        zIndex = false,
    } = options

    return cn(
        "uds-surface squircle-surface",
        isolate && "isolate",
        overflow && "overflow-hidden",
        spotlight && "spotlight-surface",
        UDS_RADIUS_CLASSES[radius],
        backgroundClass(background),
        blurClass(blur),
        borderClass(border),
        shadowClass(shadow),
        padding && "p-[7px]",
        focus && "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        text && "text-sm text-black dark:text-white font-normal leading-snug",
        zIndex === true ? "z-[999]" : zIndex || null,
        className,
    )
}

export function udsContainer(options: UDSSurfaceOptions = {}) {
    return udsSurface({
        background: "glass",
        blur: true,
        border: "soft",
        focus: true,
        padding: true,
        radius: "xl",
        shadow: "panel",
        spotlight: true,
        text: true,
        zIndex: "z-[999]",
        ...options,
    })
}

const UDS_INPUT_SURFACE = cn(
    udsSurface({
        background: "input",
        blur: false,
        border: "soft",
        radius: "xl",
        shadow: "subtle",
    }),
    "border-[color:color-mix(in_srgb,var(--border)_86%,transparent)]",
    "bg-[#ffffff]",
    "shadow-[0_1px_2px_rgba(8,8,8,0.04),0_10px_22px_rgba(8,8,8,0.035)]",
    "dark:border-[color:color-mix(in_srgb,var(--border)_88%,transparent)]",
    "dark:bg-[color:color-mix(in_srgb,var(--foreground)_5%,var(--background))]",
    "dark:shadow-[0_12px_26px_rgba(0,0,0,0.24)]",
)

const UDS_INPUT_HOVER = cn(
    "hover:border-[color:color-mix(in_srgb,var(--border)_88%,var(--foreground)_12%)]",
    "hover:bg-[color:color-mix(in_srgb,var(--surface-elevated)_96%,var(--background))]",
    "hover:shadow-[0_1px_2px_rgba(8,8,8,0.05),0_12px_28px_rgba(8,8,8,0.05)]",
    "dark:hover:border-[color:color-mix(in_srgb,var(--border)_84%,var(--foreground)_16%)]",
    "dark:hover:bg-[color:color-mix(in_srgb,var(--foreground)_7%,var(--background))]",
    "dark:hover:shadow-[0_14px_30px_rgba(0,0,0,0.30)]",
)

const UDS_INPUT_FOCUS = cn(
    "focus:outline-none focus-visible:outline-none",
    "focus-visible:border-blue-500/45 dark:focus-visible:border-blue-400/35",
    "focus-visible:bg-[color:color-mix(in_srgb,var(--surface-elevated)_100%,var(--background))]",
    "dark:focus-visible:bg-[color:color-mix(in_srgb,var(--foreground)_8%,var(--background))]",
    "focus-visible:ring-2 focus-visible:ring-blue-500/45 dark:focus-visible:ring-blue-400/35",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "focus-visible:shadow-[0_0_0_1px_rgba(59,130,246,0.14),0_12px_30px_rgba(59,130,246,0.12)]",
    "dark:focus-visible:shadow-[0_0_0_1px_rgba(96,165,250,0.12),0_16px_34px_rgba(0,0,0,0.34)]",
)

const UDS_GLIDE_SURFACE = cn(
    "relative isolate overflow-hidden",
    "[--spotlight-size:14rem]"
)

const UDS_ANIMATE_IN = "data-[state=open]:animate-[uds-surface-in_0.28s_cubic-bezier(0.16,1,0.3,1)]"
const UDS_ANIMATE_OUT = "data-[state=closed]:animate-[uds-surface-out_0.18s_cubic-bezier(0.4,0,1,1)_forwards]"

const UDS_TRANSIENT_SURFACE = udsContainer({
    background: "glass",
    blur: true,
    border: "soft",
    radius: "xl",
    shadow: "panel",
    spotlight: false,
    zIndex: "z-[1100]",
})

const UDS_DROPDOWN_SURFACE = cn(
    UDS_TRANSIENT_SURFACE,
    UDS_GLIDE_SURFACE,
    UDS_ANIMATE_IN,
    UDS_ANIMATE_OUT,
)

export const UDS = {
    radius: UDS_RADIUS_CLASSES,
    surfaceClass: udsSurface,
    containerClass: udsContainer,

    container: udsContainer(),

    text: UDS_TEXT_CLASSES,

    label: "px-2.5 py-1.5 | text-xs text-neutral-400 font-semibold tracking-wide",

    separator: cn(
        "h-px | my-2",
        "bg-gradient-to-r from-transparent via-black/[0.15] to-transparent dark:via-white/[0.14]"
    ),

    separatorVertical: cn(
        "w-px",
        "bg-gradient-to-b from-transparent via-black/[0.15] to-transparent dark:via-white/[0.14]"
    ),

    muted: "text-neutral-400",


    // Items
    item: cn(
        "relative | flex items-center gap-2 | px-4 py-2 | sq-lg",
        "text-sm text-black dark:text-white text-left outline-hidden select-none cursor-default ",
        "transition-[background-color,color,box-shadow,opacity] duration-150 ease-out"
    ),

    itemFocus: cn(
        "data-[highlighted]:bg-black/[0.06] dark:data-[highlighted]:bg-white/[0.12]",
        "data-[highlighted]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemHover: cn(
        "hover:bg-black/[0.06] dark:hover:bg-white/[0.12]",
        "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemActive: cn(
        "data-[active=true]:bg-black/[0.06] dark:data-[active=true]:bg-white/[0.12]",
        "data-[active=true]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemOpen: cn(
        "data-[state=open]:bg-black/[0.06] dark:data-[state=open]:bg-white/[0.12]",
        "data-[state=open]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemSelected: cn(
        "data-[selected=true]:bg-black/[0.06] dark:data-[selected=true]:bg-white/[0.12]",
        "data-[selected=true]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "data-[selected=true]:text-black dark:data-[selected=true]:text-white"
    ),

    itemStateActive: cn(
        "data-[state=active]:bg-black/[0.06] dark:data-[state=active]:bg-white/[0.12]",
        "data-[state=active]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemPressed: cn(
        "active:bg-black/[0.06] dark:active:bg-white/[0.12]",
        "active:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    glideSurface: cn(
        UDS_GLIDE_SURFACE
    ),

    glideHighlight: cn(
        "pointer-events-none absolute left-0 top-0 z-[1] sq-lg",
        "bg-black/[0.06] dark:bg-white/[0.12]",
        "shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "will-change-transform"
    ),

    glideItem: cn(
        "relative z-[2] w-full",
        "hover:bg-black/[0.06] dark:hover:bg-white/[0.12]",
        "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "data-[highlighted]:bg-black/[0.06] dark:data-[highlighted]:bg-white/[0.12]",
        "data-[state=open]:bg-black/[0.06] dark:data-[state=open]:bg-white/[0.12]",
        "data-[state=checked]:bg-black/[0.06] dark:data-[state=checked]:bg-white/[0.12]",
        "data-[active=true]:bg-black/[0.06] dark:data-[active=true]:bg-white/[0.12]",
        "data-[highlighted]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "data-[state=open]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "data-[state=checked]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "data-[active=true]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "hover:text-black dark:hover:text-white active:text-black dark:active:text-white",
        "data-[highlighted]:text-black dark:data-[highlighted]:text-white",
        "data-[state=open]:text-black dark:data-[state=open]:text-white",
        "data-[state=checked]:text-black dark:data-[state=checked]:text-white",
        "data-[active=true]:text-black dark:data-[active=true]:text-white",
        "active:bg-black/[0.06] dark:active:bg-white/[0.12]",
        "active:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "focus-visible:outline-none focus-visible:ring-0",
        "focus-visible:bg-black/[0.06] dark:focus-visible:bg-white/[0.12]",
        "focus-visible:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    glideSegmentGroup: cn(
        "relative z-[2] grid gap-1 sq-2xl border border-border bg-white/[0.035] p-1",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    ),

    glideSegmentItem: cn(
        "relative z-[2] flex min-h-10 items-center justify-center gap-2 sq-lg px-3 py-2",
        "text-sm text-sidebar-foreground outline-hidden transition-colors duration-150",
        "hover:bg-black/[0.06] dark:hover:bg-white/[0.12] hover:text-sidebar-accent-foreground",
        "data-[active=true]:bg-black/[0.06] dark:data-[active=true]:bg-white/[0.12]",
        "data-[active=true]:text-sidebar-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/45 focus-visible:ring-offset-0"
    ),

    itemIcon: cn(
        "[&_svg]:text-neutral-400 [&_svg]:pointer-events-none",
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:stroke-[1.9]",
        "[&_svg]:transition-colors [&_svg]:duration-150",
        "hover:[&_svg]:text-black dark:hover:[&_svg]:text-white data-[highlighted]:[&_svg]:text-black dark:data-[highlighted]:[&_svg]:text-white",
        "data-[active=true]:[&_svg]:text-black dark:data-[active=true]:[&_svg]:text-white",
        "data-[state=open]:[&_svg]:text-black dark:data-[state=open]:[&_svg]:text-white",
        "data-[state=checked]:[&_svg]:text-black dark:data-[state=checked]:[&_svg]:text-white"
    ),

    itemIconFocus: "data-[highlighted]:[&_svg]:text-black dark:data-[highlighted]:[&_svg]:text-white",

    itemDisabled: "data-disabled:pointer-events-none data-disabled:opacity-40",

    itemDestructive: cn(
        "data-[variant=destructive]:text-red-400",
        "data-[variant=destructive]:hover:bg-red-500/10 data-[variant=destructive]:hover:text-red-500 dark:data-[variant=destructive]:hover:text-red-400",
        "data-[variant=destructive]:data-[highlighted]:bg-red-500/10 data-[variant=destructive]:data-[highlighted]:text-red-500 dark:data-[variant=destructive]:data-[highlighted]:text-red-400",
        "data-[variant=destructive]:focus:text-red-400",
        "data-[variant=destructive]:[&_svg]:text-red-400!"
    ),

    checkboxItem: cn(
        "relative | flex items-center gap-2 | py-2 px-4 | sq-lg | cursor-default",
        "text-sm | text-black dark:text-white | text-left",
        "outline-hidden select-none | transition-[background-color,color,box-shadow,opacity] duration-150 ease-out"
    ),


    // Panels (dialog / sheet)
    overlay: "z-[999] | bg-black/12 dark:bg-black/25 | backdrop-blur-[3px]",

    title: "text-base text-black dark:text-white font-semibold tracking-tight leading-none",

    description: "text-sm | text-neutral-400",

    closeButton: cn(
        "p-1.5 | sq-lg opacity-70",
        "text-neutral-400",
        "transition-[background-color,color,box-shadow,opacity,transform] duration-200",
        "hover:bg-white/[0.12] | hover:opacity-100 hover:text-black dark:hover:text-white",
        "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:ring-offset-2 | disabled:pointer-events-none"
    ),

    shortcut: "ml-auto | text-xs text-neutral-400 | tracking-wide",

    panelGlow: UDS_PANEL_SHADOW,


    // Animations
    animateIn: UDS_ANIMATE_IN,

    animateOut: UDS_ANIMATE_OUT,


    // Shared design tokens
    surface: udsSurface({
        background: "surface",
        blur: false,
        border: "soft",
        radius: "xl",
        shadow: "subtle",
    }),

    subtleFill: udsSurface({
        background: "subtle",
        blur: false,
        border: false,
        isolate: false,
        overflow: false,
        radius: "md",
        shadow: "flat",
    }),

    elevatedSurface: udsSurface({
        background: "elevated",
        blur: false,
        border: false,
        radius: "xl",
        shadow: "subtle",
    }),

    raisedSurface: udsSurface({
        background: "raised",
        blur: false,
        border: false,
        radius: "xl",
        shadow: "subtle",
    }),

    panelSurface: udsSurface({
        background: "subtle",
        blur: false,
        border: "soft",
        className: "uds-card-surface",
        radius: "xl",
        shadow: "card",
    }),

    appChromeSurface: udsSurface({
        background: "glass",
        blur: false,
        border: "soft",
        radius: "xl",
        shadow: "flat",
        spotlight: true,
    }),

    dataPanelSurface: udsSurface({
        background: "subtle",
        blur: false,
        border: "soft",
        className: "uds-card-surface",
        radius: "xl",
        shadow: "card",
    }),

    authPanelSurface: udsSurface({
        background: "glass",
        blur: true,
        border: "strong",
        radius: "2xl",
        shadow: "panel",
        spotlight: true,
    }),

    mobileDockSurface: udsSurface({
        background: "glass",
        blur: false,
        border: "strong",
        radius: "2xl",
        shadow: "panel",
        spotlight: false,
    }),

    commandTriggerSurface: udsSurface({
        background: "glass",
        blur: false,
        border: "muted",
        radius: "full",
        shadow: "flat",
    }),

    transientSurface: UDS_TRANSIENT_SURFACE,

    dropdownSurface: UDS_DROPDOWN_SURFACE,

    dropdownContent: "relative z-[2] space-y-0.5",

    tileSurface: udsSurface({
        background: "subtle",
        blur: false,
        border: "muted",
        className: "uds-card-surface",
        radius: "xl",
        shadow: "flat",
    }),

    summaryTileSurface: cn(
        udsSurface({
            background: false,
            blur: false,
            border: "soft",
            className: "uds-card-surface",
            radius: "xl",
            shadow: "flat",
        }),
        "relative min-h-[112px] min-w-0 overflow-hidden p-4 text-foreground"
    ),

    summaryLabel: cn("flex items-center gap-1.5", UDS_TEXT_CLASSES.caption),

    summaryValue: UDS_TEXT_CLASSES.value,

    largeTileSurface: udsSurface({
        background: "subtle",
        blur: false,
        border: "muted",
        className: "uds-card-surface",
        radius: "2xl",
        shadow: "flat",
    }),

    inlineSurface: udsSurface({
        background: "surface",
        blur: false,
        border: "muted",
        className: "uds-card-surface",
        radius: "lg",
        shadow: "flat",
    }),

    controlSurface: UDS_INPUT_SURFACE,

    pillSurface: udsSurface({
        background: "subtle",
        blur: false,
        border: "muted",
        radius: "full",
        shadow: "flat",
    }),

    floatingPillSurface: udsSurface({
        background: "glass",
        blur: true,
        border: "muted",
        radius: "full",
        shadow: "subtle",
    }),

    iconSurface: udsSurface({
        background: "subtle",
        blur: false,
        border: "muted",
        radius: "2xl",
        shadow: "flat",
    }),

    focusRing: "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:focus-visible:ring-blue-500/30 focus-visible:border-transparent",

    inputSurface: UDS_INPUT_SURFACE,

    inputHover: UDS_INPUT_HOVER,

    inputFocus: UDS_INPUT_FOCUS,

    disabledSurface: "bg-black/[0.02] dark:bg-white/[0.03] text-neutral-400",


    // Card surfaces
    cardSurfaceShadow: UDS_CARD_SURFACE_SHADOW,
    cardFlatShadow: UDS_CARD_FLAT_SHADOW,

    cardSurface: cn(
        "squircle-surface uds-card-surface text-foreground",
        udsSurface({
            background: false,
            blur: false,
            border: "soft",
            radius: "normal",
            shadow: "card",
        })
    ),

    cardHover: cn(
        "hover:bg-[color:var(--card-hover)]",
        UDS_BORDER_HOVER,
    ),

    cardLiftShadow: "",

    cardSelected: cn(
        "bg-primary/[0.06] dark:bg-primary/[0.08] border-primary/40 ring-1 ring-primary/15",
    ),

    selectionSurface: cn(
        "bg-[color:var(--selection-cell-background)] text-foreground",
        "hover:bg-[color:var(--selection-cell-background-hover)]",
    ),

    selectionHighlight: "",

    selectedRing: cn(
        "border-primary/40 ring-1 ring-primary/15"
    ),

    rowSelected: "data-[state=selected]:bg-[color:var(--selection-cell-background)] data-[state=selected]:hover:bg-[color:var(--selection-cell-background-hover)]",

    selectedControl: cn(
        udsSurface({
            background: "raised",
            blur: false,
            border: "strong",
            radius: "full",
            shadow: "flat",
        }),
        "text-foreground",
        "hover:bg-[color:var(--selection-cell-background-hover)]",
        UDS_BORDER_HOVER,
    ),

    primaryControl: cn(
        udsSurface({
            background: "raised",
            blur: false,
            border: "strong",
            radius: "xl",
            shadow: "subtle",
        }),
        "text-foreground hover:bg-[color:color-mix(in_srgb,var(--primary)_16%,var(--background))]",
    ),

    cardDivider: "border-border",

    divideLine: "divide-border",

    hairline: "bg-border",

    hairlineStrong: "bg-border",

    activeRing: cn(
        "ring-2 ring-blue-500/50 dark:ring-blue-500/30 border-transparent"
    ),

    buttonShadow: "[box-shadow:var(--shadow-subtle)] hover:[box-shadow:var(--shadow-elevated)]",

    destructiveButtonShadow: "[box-shadow:0_1px_2px_rgb(8_8_8_/_0.10)] hover:[box-shadow:0_10px_22px_rgb(239_68_68_/_0.20)]",

    dividerLine: "flex-1 h-px bg-black/10 dark:bg-white/8",

    dividerLabel: "text-xs uppercase tracking-wider text-neutral-400",

    iconBadge: "flex items-center justify-center w-14 h-14 sq-2xl",


    // Destructive tokens
    destructiveBadge: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",

    semanticBadge: UDS_SEMANTIC_BADGE_CLASSES,

    statCardTone: UDS_STAT_CARD_TONE_CLASSES,

    destructiveText: "text-red-600 dark:text-red-400",

    destructiveAlert: cn(
        "bg-red-500/[0.10] border border-red-500/20 text-red-600 dark:text-red-400",
        "shadow-[0_8px_24px_rgba(239,68,68,0.08)]",
        "sq-xl squircle-surface"
    ),

    destructiveHover: "hover:bg-red-500/10 hover:text-red-500",

    destructiveValidation: "border-red-500/50! ring-red-500/20!",
} as const
