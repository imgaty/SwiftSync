"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

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
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          // Solid surface
          "bg-white dark:bg-neutral-950",
          // Border & shadow
          "border border-black/10 dark:border-white/10",
          "shadow-xl",
          // Shape & sizing
          "rounded-xl min-w-[220px] p-[5px]",
          // Typography
          "text-[13px] leading-snug font-normal",
          "text-black dark:text-white",
          "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Helvetica_Neue',sans-serif]",
          // Layout
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
          // Animation
          "data-[state=open]:animate-[apple-menu-in_0.18s_cubic-bezier(0.16,1,0.3,1)]",
          "data-[state=closed]:animate-[apple-menu-out_0.12s_ease-in_forwards]",
          className
        )}
        {...props}
      >
        {children}
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
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        // Base item styling
        "relative flex cursor-default items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-[13px] outline-hidden select-none",
        "transition-colors duration-75",
        // Icon styling
        "[&_svg:not([class*='text-'])]:text-black/50 dark:[&_svg:not([class*='text-'])]:text-white/50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Hover/focus: frosted transparent highlight
        "focus:bg-black/10 dark:focus:bg-white/10",
        "focus:[&_svg:not([class*='text-'])]:text-black/70 dark:focus:[&_svg:not([class*='text-'])]:text-white/70",
        // Destructive variant
        "data-[variant=destructive]:text-red-500 data-[variant=destructive]:focus:bg-red-500/10 data-[variant=destructive]:focus:text-red-600 dark:data-[variant=destructive]:focus:text-red-400",
        "data-variant=destructive:*:[svg]:text-red-500!",
        // Disabled
        "data-disabled:pointer-events-none data-disabled:opacity-40",
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
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-[7px] py-1.5 pr-2.5 pl-8 text-[13px] outline-hidden select-none",
        "transition-colors duration-75",
        "focus:bg-black/10 dark:focus:bg-white/10",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
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
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-[7px] py-1.5 pr-2.5 pl-8 text-[13px] outline-hidden select-none",
        "transition-colors duration-75",
        "focus:bg-black/10 dark:focus:bg-white/10",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
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
        "px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40 data-inset:pl-8",
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
      className={cn("bg-black/8 dark:bg-white/8 -mx-[5px] my-[5px] h-px", className)}
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
        "text-black/40 dark:text-white/40 ml-auto text-[12px] tracking-wide",
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
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-[13px] outline-hidden select-none",
        "transition-colors duration-75",
        "[&_svg:not([class*='text-'])]:text-black/50 dark:[&_svg:not([class*='text-'])]:text-white/50",
        "focus:bg-black/10 dark:focus:bg-white/10 focus:[&_svg:not([class*='text-'])]:text-black/70 dark:focus:[&_svg:not([class*='text-'])]:text-white/70",
        "data-[state=open]:bg-black/10 dark:data-[state=open]:bg-white/10 data-[state=open]:[&_svg:not([class*='text-'])]:text-black/70 dark:data-[state=open]:[&_svg:not([class*='text-'])]:text-white/70",
        "data-inset:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-3.5 opacity-60" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        // Solid surface
        "bg-white dark:bg-neutral-950",
        // Border & shadow
        "border border-black/10 dark:border-white/10",
        "shadow-xl",
        // Shape
        "rounded-xl min-w-[200px] p-[5px]",
        // Typography
        "text-[13px] leading-snug text-black dark:text-white",
        // Layout
        "z-50 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden",
        // Animation
        "data-[state=open]:animate-[apple-menu-in_0.18s_cubic-bezier(0.16,1,0.3,1)]",
        "data-[state=closed]:animate-[apple-menu-out_0.12s_ease-in_forwards]",
        className
      )}
      {...props}
    />
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
