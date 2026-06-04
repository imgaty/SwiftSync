//
//  switch.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Switch UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center border-2 border-transparent transition-[background-color,border-color,box-shadow,opacity] duration-150 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        UDS.surface,
        "sq-full data-[state=checked]:bg-primary/[0.20] data-[state=checked]:text-primary",
        "focus-visible:border-transparent focus-visible:ring-focus/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          UDS.raisedSurface,
          "pointer-events-none block size-4 sq-full ring-0 transition-transform duration-150 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
