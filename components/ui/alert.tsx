//
//  alert.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Defines the reusable Alert UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  cn(
    UDS.cardSurface,
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 sq-lg px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current"
  ),
  {
    variants: {
      variant: {
        default: "text-card-foreground",
        destructive:
          cn(UDS.destructiveAlert, "text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current"),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-neutral-400 [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
