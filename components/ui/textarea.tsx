//
//  textarea.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Textarea UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import * as React from "react"

import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full px-4 py-3 text-[15px] text-foreground caret-blue-600 transition-[background-color,border-color,color,box-shadow,opacity] duration-200 outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-70 aria-invalid:border-destructive/60 aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive/70 aria-invalid:focus-visible:ring-destructive/25 dark:caret-blue-300 dark:aria-invalid:ring-destructive/30",
        UDS.inputSurface,
        UDS.inputHover,
        UDS.inputFocus,
        "disabled:bg-black/[0.02] dark:disabled:bg-white/[0.03] disabled:text-neutral-400",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
