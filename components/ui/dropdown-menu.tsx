//
//  dropdown-menu.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Dropdown menu UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { UDS } from "@/lib/UDS"
import { GlideHighlight, useGlideHighlight } from "@/components/ui/glide-highlight"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { rect, visible, menuHandlers } = useGlideHighlight({
    surfaceRef: contentRef,
    keyboardNavigation: false,
  })

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={contentRef}
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={16}
        avoidCollisions={true}
        className={cn(
          UDS.transientSurface,
          UDS.glideSurface,
          UDS.animateIn,
          UDS.animateOut,
          "z-[999] w-[220px] max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
          className
        )}
        {...props}
        {...menuHandlers}
      >
        <GlideHighlight rect={rect} visible={visible} />
        <div className="relative z-[2] space-y-0.5">
          {children}
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-glide-item={dataGlideItem}
      data-inset={inset}
      data-variant={variant}
      className={cn(
        UDS.item,
        UDS.glideItem,
        UDS.itemIcon,
        UDS.itemIconFocus,
        UDS.itemDestructive,
        UDS.itemDisabled,
        "data-inset:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-glide-item={dataGlideItem}
      className={cn(
        UDS.checkboxItem,
        UDS.glideItem,
        UDS.itemDisabled,
        UDS.itemIcon,
        className
      )}
      checked={checked}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-glide-item={dataGlideItem}
      className={cn(
        UDS.checkboxItem,
        UDS.glideItem,
        UDS.itemDisabled,
        UDS.itemIcon,
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        UDS.label, "data-inset:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(UDS.separator, className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        UDS.shortcut,
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-glide-item={dataGlideItem}
      data-inset={inset}
      className={cn(
        UDS.item,
        UDS.glideItem,
        UDS.itemIcon,
        UDS.itemIconFocus,
        "data-inset:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-3.5" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { rect, visible, menuHandlers } = useGlideHighlight({
    surfaceRef: contentRef,
    keyboardNavigation: false,
  })

  return (
    <DropdownMenuPrimitive.SubContent
      ref={contentRef}
      data-slot="dropdown-menu-sub-content"
      className={cn(
        UDS.transientSurface,
        UDS.glideSurface,
        UDS.animateIn,
        UDS.animateOut,
        "z-[999] w-[220px] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden",
        className
      )}
      {...props}
      {...menuHandlers}
    >
      <GlideHighlight rect={rect} visible={visible} />
      <div className="relative z-[2] space-y-0.5">
        {children}
      </div>
    </DropdownMenuPrimitive.SubContent>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
