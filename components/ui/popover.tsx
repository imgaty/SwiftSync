//
//  popover.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Popover UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import { GlideHighlight, useGlideHighlight } from "@/components/ui/glide-highlight"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  collisionPadding = 16,
  avoidCollisions = true,
  sticky = "always",
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { rect, visible, menuHandlers } = useGlideHighlight({
    surfaceRef: contentRef,
    keyboardNavigation: false,
  })

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={contentRef}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        avoidCollisions={avoidCollisions}
        sticky={sticky}
        className={cn(
          UDS.transientSurface,
          UDS.glideSurface,
          UDS.animateIn,
          UDS.animateOut,
          "z-[999] w-[220px] origin-(--radix-popover-content-transform-origin) outline-hidden max-h-[calc(100vh-4rem)] overflow-y-auto",
          className
        )}
        {...props}
        {...menuHandlers}
      >
        <GlideHighlight rect={rect} visible={visible} />
        <div className="relative z-[2] space-y-0.5">
          {children}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
