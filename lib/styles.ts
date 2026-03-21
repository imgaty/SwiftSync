// =============================================================================
// SHARED DESIGN TOKENS
// =============================================================================
// Single source of truth for recurring UI patterns. Import these constants
// instead of hard-coding the same Tailwind strings in every component.
// =============================================================================

/** Low-contrast surface: input backgrounds, cards, outline buttons */
export const SURFACE =
  'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl'

/** Focus ring for interactive elements */
export const FOCUS_RING =
  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/30 focus:border-transparent'

/** Active/open ring (non-focus variant, e.g. popover open state) */
export const ACTIVE_RING =
  'ring-2 ring-blue-500/50 dark:ring-blue-500/30 border-transparent'

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

/** Primary CTA — dark bg in light mode, white bg in dark mode */
export const BTN_PRIMARY =
  'w-full h-12 text-[15px] font-semibold bg-black dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl shadow-sm hover:shadow-md hover:shadow-black/10 dark:hover:shadow-white/5 active:scale-[0.97] transition-all duration-200 ease-out cursor-pointer group'

/** Outline / secondary — matches OAuth button style */
export const BTN_OUTLINE =
  'w-full h-12 text-[15px] font-semibold bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 rounded-xl active:scale-[0.97] transition-all duration-200 ease-out cursor-pointer group'

/** Small ghost button for dropdown headers, nav arrows */
export const BTN_GHOST_SM =
  'h-8 px-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors'

/** Small icon-only nav button (prev/next arrows in pickers) */
export const BTN_NAV =
  'h-8 w-8 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors'

// ---------------------------------------------------------------------------
// Typography & layout helpers
// ---------------------------------------------------------------------------

/** OR divider line */
export const DIVIDER_LINE = 'flex-1 h-px bg-black/10 dark:bg-white/8'

/** OR divider label */
export const DIVIDER_LABEL =
  'text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-600'

/** Subtle text-link row at form bottom (e.g. "Back to login") */
export const LINK_SUBTLE =
  'flex items-center justify-center gap-2 w-full text-[13px] font-medium text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer'

// ---------------------------------------------------------------------------
// Panels & popups
// ---------------------------------------------------------------------------

/** Container for dropdown panels / popovers */
export const PANEL =
  'rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-xl'

/** Header bar inside a panel */
export const PANEL_HEADER =
  'flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.03]'

/** Footer bar inside a panel */
export const PANEL_FOOTER =
  'px-3 py-3 border-t border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.03] backdrop-blur-md'

// ---------------------------------------------------------------------------
// Status icon badges
// ---------------------------------------------------------------------------

// Base badge (14x14 rounded-2xl) — add color bg + border per variant
export const ICON_BADGE =
  'flex items-center justify-center w-14 h-14 rounded-2xl'
