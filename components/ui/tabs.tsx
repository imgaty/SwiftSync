//
//  tabs.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Tabs UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        UDS.surface,
        "inline-flex h-9 w-fit items-center justify-center p-[3px] text-neutral-400",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        UDS.item,
        UDS.itemHover,
        UDS.itemStateActive,
        "inline-flex h-[calc(100%-1px)] flex-1 justify-center gap-1.5 sq-full border border-transparent sq-border-muted px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground dark:text-neutral-400",
        "data-[state=active]:text-foreground",
        "focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus/70 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:stroke-[1.9]",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
