//
//  badge.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Badge UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center sq-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus/70 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          cn(UDS.raisedSurface, "text-primary dark:text-primary-foreground [a&]:hover:bg-primary/[0.20]"),
        secondary:
          cn(UDS.pillSurface, "text-secondary-foreground", UDS.itemHover),
        destructive:
          cn(UDS.destructiveAlert, "[a&]:hover:bg-red-500/[0.16] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"),
        outline:
          cn(UDS.pillSurface, "text-foreground [a&]:hover:text-accent-foreground", UDS.itemHover),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
