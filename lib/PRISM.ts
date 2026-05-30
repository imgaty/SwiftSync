//
//  PRISM.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared PRISM logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { cn } from "@/lib/utils"

const PRISM_CARD_SURFACE_SHADOW =
    "shadow-[0_10px_32px_rgba(8,8,8,0.045)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.22)]"

const PRISM_CARD_FLAT_SHADOW = "shadow-none"

export const PRISM = {
    container: cn(
        "spotlight-surface p-[7px] z-[999] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        "prism-glass border rounded-xl",
        "text-[13px] text-black dark:text-white font-normal leading-snug",
    ),

    label: "pb-2 pl-4 pr-4 | text-[13px] text-neutral-400 font-semibold tracking-wide",

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
        "relative | flex items-center gap-2 | px-4 py-2 | rounded-lg",
        "text-[13px] text-black dark:text-white text-left outline-hidden select-none cursor-default ",
        "transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out"
    ),

    itemFocus: cn(
        "data-[highlighted]:bg-black/[0.06] dark:data-[highlighted]:bg-white/[0.12]",
        "data-[highlighted]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemHover: cn(
        "hover:bg-black/[0.06] dark:hover:bg-white/[0.12]",
        "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    glideSurface: cn(
        "relative isolate overflow-hidden",
        "[--spotlight-size:14rem]"
    ),

    glideHighlight: cn(
        "pointer-events-none absolute left-0 top-0 z-[1] rounded-md",
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
        "active:scale-[0.98] active:bg-black/[0.06] dark:active:bg-white/[0.12]",
        "focus-visible:outline-none focus-visible:ring-0",
        "focus-visible:bg-black/[0.06] dark:focus-visible:bg-white/[0.12]",
        "focus-visible:shadow-[inset_0_0_0_1px_rgba(8,8,8,0.24)] dark:focus-visible:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26)]"
    ),

    glideSegmentGroup: cn(
        "relative z-[2] grid gap-1 rounded-2xl border border-white/[0.10] bg-white/[0.035] p-1",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    ),

    glideSegmentItem: cn(
        "relative z-[2] flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2",
        "text-[13px] text-sidebar-foreground outline-hidden transition-colors duration-150",
        "hover:bg-black/[0.06] dark:hover:bg-white/[0.12] hover:text-sidebar-accent-foreground",
        "data-[active=true]:bg-black/[0.06] dark:data-[active=true]:bg-white/[0.12]",
        "data-[active=true]:text-sidebar-accent-foreground active:scale-[0.98]",
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
        "relative | flex items-center gap-2 | py-2 px-4 | rounded-lg | cursor-default",
        "text-[13px] | text-black dark:text-white | text-left",
        "outline-hidden select-none | transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out"
    ),


    // Panels (dialog / sheet) — keep context visible while still separating
    // the modal from the page behind it.
    overlay: "z-[999] | bg-black/10 dark:bg-black/[0.22] | backdrop-blur-[6px] backdrop-saturate-150",

    title: "text-[15px] text-black dark:text-white font-semibold tracking-tight leading-none",

    description: "text-[13px] | text-neutral-400",

    closeButton: cn(
        "p-1.5 | rounded-lg opacity-70",
        "text-neutral-400",
        "transition-[background-color,color,box-shadow,opacity,transform] duration-200",
        
        "hover:bg-white/[0.12] | hover:opacity-100 hover:text-black dark:hover:text-white",
        "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]",
        "focus:outline-none focus:ring-2 focus:ring-white/10 focus:ring-offset-2 | disabled:pointer-events-none"
    ),

    shortcut: "ml-auto | text-[12px] text-neutral-400 | tracking-wide",


    // Animations
    animateIn: "data-[state=open]:animate-[prism-surface-in_0.28s_cubic-bezier(0.16,1,0.3,1)]",                 // Scale | Blur-In | Fade

    animateOut: "data-[state=closed]:animate-[prism-surface-out_0.18s_cubic-bezier(0.4,0,1,1)_forwards]",       // Shrink | Blur-Out | Fade


    // Shared Design Tokens (Used in Input Elements)
    surface: 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl',

    focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 focus:border-transparent',


    // Card Surfaces — interior groupings inside dialogs / sheets / pages.
    // Use cardSurface as the base; layer cardHover / cardSelected on top via cn().
    // These work in BOTH light and dark mode (unlike raw white/x which only
    // shows up against a dark background).
    cardSurfaceShadow: PRISM_CARD_SURFACE_SHADOW,
    cardFlatShadow: PRISM_CARD_FLAT_SHADOW,

    cardSurface: cn(
        "rounded-xl border",
        "bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] dark:bg-white/[0.055]",
        "border-black/[0.07] dark:border-white/10",
        PRISM_CARD_SURFACE_SHADOW,
    ),

    cardHover: "hover:bg-[color:color-mix(in_srgb,var(--surface-elevated)_84%,transparent)] hover:border-black/10 dark:hover:bg-white/[0.065] dark:hover:border-white/14",

    cardSelected: cn(
        "bg-primary/6 dark:bg-primary/8",
        "border-primary/40",
        "ring-1 ring-primary/15",
    ),

    cardDivider: "border-black/6 dark:border-white/8",

    activeRing: 'ring-2 ring-blue-500/50 dark:ring-blue-500/30 border-transparent',

    dividerLine: 'flex-1 h-px bg-black/10 dark:bg-white/8',

    dividerLabel: 'text-[11px] uppercase tracking-wider text-neutral-400',

    iconBadge: 'flex items-center justify-center w-14 h-14 rounded-2xl',                                        // Status icon badge (auth pages)


    // Destructive Tokens (Elements with destructive properties)
    destructiveBadge: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',

    destructiveText: 'text-red-600 dark:text-red-400',

    destructiveAlert: 'bg-red-500/10 border border-red-500/20 rounded-xl',                                      // Error/warning container surface

    destructiveHover: 'hover:bg-red-500/10 hover:text-red-500',

    destructiveValidation: 'border-red-500/50! ring-red-500/20!',                                               // Input validation error ring
} as const
