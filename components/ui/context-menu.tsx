//
//  context-menu.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Defines the reusable Context menu UI primitive for Argent, centralizing styling,
//  composition behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
"use client"

import * as React from "react"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"

import { cn } from "@/lib/utils"
import { PRISM } from "@/lib/PRISM"
import { GlideHighlight, useGlideHighlight } from "@/components/ui/glide-highlight"

function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  )
}

function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
}

function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-glide-item={dataGlideItem}
      data-inset={inset}
      className={cn(
        PRISM.item,
        PRISM.itemIcon,
        PRISM.glideItem,
        PRISM.itemIconFocus,
        "data-[inset]:pl-8 data-[state=open]:bg-transparent data-[state=open]:shadow-none",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </ContextMenuPrimitive.SubTrigger>
  )
}

function ContextMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { rect, visible, menuHandlers } = useGlideHighlight({
    surfaceRef: contentRef,
    keyboardNavigation: false,
  })

  return (
    <ContextMenuPrimitive.SubContent
      ref={contentRef}
      data-slot="context-menu-sub-content"
      className={cn(
        PRISM.container,
        PRISM.glideSurface,
        PRISM.animateIn,
        PRISM.animateOut,
        "z-50 origin-(--radix-context-menu-content-transform-origin) overflow-hidden",
        className
      )}
      {...props}
      {...menuHandlers}
    >
      <GlideHighlight rect={rect} visible={visible} />
      <div className="relative z-[2] space-y-0.5">
        {children}
      </div>
    </ContextMenuPrimitive.SubContent>
  )
}

function ContextMenuContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { rect, visible, menuHandlers } = useGlideHighlight({
    surfaceRef: contentRef,
    keyboardNavigation: false,
  })

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={contentRef}
        data-slot="context-menu-content"
        collisionPadding={16}
        avoidCollisions={true}
        className={cn(
          PRISM.container,
          PRISM.glideSurface,
          PRISM.animateIn,
          PRISM.animateOut,
          "z-50 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
          className
        )}
        {...props}
        {...menuHandlers}
      >
        <GlideHighlight rect={rect} visible={visible} />
        <div className="relative z-[2] space-y-0.5">
          {children}
        </div>
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-glide-item={dataGlideItem}
      data-inset={inset}
      data-variant={variant}
      className={cn(
        PRISM.item,
        PRISM.glideItem,
        PRISM.itemDisabled,
        PRISM.itemIcon,
        PRISM.itemDestructive,
        "data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      data-glide-item={dataGlideItem}
      className={cn(
        PRISM.checkboxItem,
        PRISM.glideItem,
        PRISM.itemDisabled,
        PRISM.itemIcon,
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  const generatedGlideId = React.useId()
  const dataGlideItem =
    (props as { "data-glide-item"?: string })["data-glide-item"] ??
    props.id ??
    generatedGlideId

  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      data-glide-item={dataGlideItem}
      className={cn(
        PRISM.checkboxItem,
        PRISM.glideItem,
        PRISM.itemDisabled,
        PRISM.itemIcon,
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        PRISM.label, "data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(PRISM.separator, className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        PRISM.shortcut,
        className
      )}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}
