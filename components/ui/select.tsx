//
//  select.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Select UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import { GlideHighlight, useGlideHighlight } from "@/components/ui/glide-highlight"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-2 whitespace-nowrap sq-lg border px-3 py-2 text-sm leading-snug outline-none transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150",
        UDS.surface,
        "text-neutral-700 dark:text-neutral-300",
        UDS.itemHover,
        UDS.itemOpen,
        UDS.focusRing,
        "disabled:cursor-not-allowed disabled:opacity-50",
        "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]",
        "data-[size=default]:h-9 data-[size=sm]:h-8",
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-neutral-400 dark:[&_svg:not([class*='text-'])]:text-neutral-400",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { rect, visible, menuHandlers } = useGlideHighlight({
    surfaceRef: contentRef,
    keyboardNavigation: false,
  })

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={contentRef}
        data-slot="select-content"
        data-squircle-expand-radius="false"
        collisionPadding={16}
        avoidCollisions={true}
        className={cn(
          UDS.dropdownSurface,
          "relative z-[1100] max-h-(--radix-select-content-available-height) w-[220px] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
        {...menuHandlers}
      >
        <GlideHighlight rect={rect} visible={visible} />
        <div className="relative z-[2]">
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "space-y-0.5 p-0",
              position === "popper" &&
                "max-h-(--radix-select-content-available-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1"
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </div>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(UDS.label, className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      data-squircle-expand-radius="false"
      data-glide-item={dataGlideItem}
      className={cn(
        UDS.item,
        UDS.glideItem,
        UDS.itemDisabled,
        UDS.itemIcon,
        "w-full",
        "*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(UDS.separator, "pointer-events-none", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
