// Revised: 11 Apr 2026 - 16h52

// Polished Refractive Interface Surface Map (PRISM)
// Documentation: `docs/Visual Identity & Styling.md`


import { cn } from "@/lib/utils"

export const PRISM = {
    container: cn(
        "p-[7px] z-[999]",
        "bg-white/90 dark:bg-neutral-800/92 backdrop-blur-xl backdrop-saturate-[1.45]",
        "border border-black/[0.08] dark:border-white/[0.16] rounded-xl",
        "shadow-[0_10px_28px_rgba(0,0,0,0.14),inset_0_0.5px_0_rgba(255,255,255,0.34)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.22),inset_0_0.5px_0_rgba(255,255,255,0.18)]",
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
        "transition-all duration-150 ease-out"
    ),

    itemFocus: cn(
        "data-[highlighted]:bg-black/[0.06] dark:data-[highlighted]:bg-white/[0.12]",
        "data-[highlighted]:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemHover: cn(
        "hover:bg-black/[0.06] dark:hover:bg-white/[0.12]",
        "hover:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.15)]"
    ),

    itemIcon: cn(
        "[&_svg]:text-neutral-400 [&_svg]:pointer-events-none",
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:stroke-[1.9]",
        "[&_svg]:transition-colors [&_svg]:duration-150",
        "hover:[&_svg]:text-black dark:hover:[&_svg]:text-white data-[highlighted]:[&_svg]:text-black dark:data-[highlighted]:[&_svg]:text-white"
    ),

    itemIconFocus: "data-[highlighted]:[&_svg]:text-black dark:data-[highlighted]:[&_svg]:text-white",

    itemDisabled: "data-disabled:pointer-events-none data-disabled:opacity-40",

    itemDestructive: cn(
        "data-[variant=destructive]:text-red-400",
        "data-[variant=destructive]:focus:bg-red-500/10 data-[variant=destructive]:focus:text-red-400",
        "data-[variant=destructive]:[&_svg]:text-red-400!"
    ),

    checkboxItem: cn(
        "relative | flex items-center gap-2 | py-2 px-4 | rounded-lg | cursor-default",
        "text-[13px] | text-black dark:text-white | text-left",
        "outline-hidden select-none | transition-all duration-150 ease-out"
    ),


    // Panels (dialog / sheet) — keep context visible while still separating
    // the modal from the page behind it.
    overlay: "z-[999] | bg-black/12 dark:bg-black/25 | backdrop-blur-[3px]",

    title: "text-[15px] text-black dark:text-white font-semibold tracking-tight leading-none",

    description: "text-[13px] | text-neutral-400",

    closeButton: cn(
        "p-1.5 | rounded-lg opacity-70",
        "text-neutral-400",
        "transition-all duration-200",
        
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
    cardSurface: cn(
        "rounded-xl border",
        "bg-black/2 dark:bg-white/3",
        "border-black/6 dark:border-white/8",
        "backdrop-blur-sm",
    ),

    cardHover: "hover:bg-black/4 dark:hover:bg-white/6 hover:border-black/10 dark:hover:border-white/12",

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
