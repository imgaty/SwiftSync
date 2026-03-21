'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Check, Sun, Moon, Monitor, PanelLeft, PanelRight, Eye, Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export const Dropdown = DropdownMenu
export const DropdownTrigger = DropdownMenuTrigger
export const DropdownShell = DropdownMenuContent
export const DropdownGroup = DropdownMenuGroup
export const DropdownItem = DropdownMenuItem
export const DropdownCheckboxItem = DropdownMenuCheckboxItem
export const DropdownLabel = DropdownMenuLabel
export const DropdownSeparator = DropdownMenuSeparator
export const DropdownShortcut = DropdownMenuShortcut
export const DropdownSub = DropdownMenuSub
export const DropdownSubTrigger = DropdownMenuSubTrigger
export const DropdownSubContent = DropdownMenuSubContent
export const DropdownPortal = DropdownMenuPortal
export const DropdownRadioGroup = DropdownMenuRadioGroup
export const DropdownRadioItem = DropdownMenuRadioItem

type DropdownUniversalShellProps = ComponentProps<typeof DropdownMenuContent> & {
  width?: number
}

export function DropdownUniversalShell({
  children,
  className,
  width = 224,
  align = 'end',
  sideOffset = 6,
  style,
  ...props
}: DropdownUniversalShellProps) {
  return (
    <DropdownShell
      align={align}
      sideOffset={sideOffset}
      className={cn('rounded-lg border-black/10 dark:border-white/10 p-[7px]', className)}
      style={{ width, ...style }}
      {...props}
    >
      {children}
    </DropdownShell>
  )
}

type DropdownUniversalSectionProps = {
  title: ReactNode
  children: ReactNode
  showSeparator?: boolean
}

export function DropdownUniversalSection({
  title,
  children,
  showSeparator,
}: DropdownUniversalSectionProps) {
  return (
    <>
      <DropdownLabel className="px-3 pt-2 pb-1">{title}</DropdownLabel>
      {children}
      {showSeparator ? <DropdownSeparator className="mx-2 my-[5px]" /> : null}
    </>
  )
}

type DropdownUniversalItemProps = {
  active?: boolean
  onSelect?: () => void
  children: ReactNode
  icon?: ReactNode
}

export function DropdownUniversalItem({
  active,
  onSelect,
  children,
  icon,
}: DropdownUniversalItemProps) {
  return (
    <DropdownItem
      onSelect={onSelect}
      className="group flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-[13px]"
    >
      {icon && <span className="flex shrink-0 items-center justify-center text-black/50 dark:text-white/50 [&_svg]:h-3.5 [&_svg]:w-3.5 ml-1">{icon}</span>}
      <span>{children}</span>
      <span className="ml-auto flex w-6 shrink-0 items-center justify-center">
        {active ? <Check className="h-[13px] w-[13px] stroke-[2.5]" /> : null}
      </span>
    </DropdownItem>
  )
}

export const DropdownChild = DropdownUniversalSection
export const DropdownSection = DropdownUniversalSection

export type DropdownOption = {
  value: string
  label: ReactNode
  icon?: ReactNode
  description?: ReactNode
  disabled?: boolean
}

type DropdownOptionsSectionProps = {
  title: ReactNode
  showSeparator?: boolean
  options: DropdownOption[]
  selectedValue?: string
  onSelect: (value: string) => void
}

export function DropdownOptionsSection({
  title,
  showSeparator,
  options,
  selectedValue,
  onSelect,
}: DropdownOptionsSectionProps) {
  return (
    <DropdownUniversalSection title={title} showSeparator={showSeparator}>
      {options.map((option) => (
        <DropdownUniversalItem
          key={option.value}
          active={selectedValue === option.value}
          onSelect={() => onSelect(option.value)}
          icon={option.icon}
        >
          <span className="flex items-center gap-1">
            <span>{option.label}</span>
            {option.description ? (
              <span className="text-[11px] text-black/45 dark:text-white/45">{option.description}</span>
            ) : null}
          </span>
        </DropdownUniversalItem>
      ))}
    </DropdownUniversalSection>
  )
}

type DropdownLanguageSectionProps = {
  selectedLanguage: string
  onSelectLanguage: (language: string) => void
  withSeparator?: boolean
  title?: ReactNode
}

const DEFAULT_LANGUAGE_OPTIONS: DropdownOption[] = [
  { value: 'en', label: 'English', icon: <Globe /> },
  { value: 'pt', label: 'Português', icon: <Globe /> },
]

export function DropdownLanguageSection({
  selectedLanguage,
  onSelectLanguage,
  withSeparator,
  title = 'Language',
}: DropdownLanguageSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showSeparator={withSeparator}
      options={DEFAULT_LANGUAGE_OPTIONS}
      selectedValue={selectedLanguage}
      onSelect={onSelectLanguage}
    />
  )
}

type DropdownThemeSectionProps = {
  selectedTheme?: string
  onSelectTheme: (theme: string) => void
  withSeparator?: boolean
  title?: ReactNode
}

const THEME_OPTIONS: DropdownOption[] = [
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
  { value: 'system', label: 'System', icon: <Monitor /> },
]

export function DropdownThemeSection({
  selectedTheme,
  onSelectTheme,
  withSeparator,
  title = 'Theme',
}: DropdownThemeSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showSeparator={withSeparator}
      options={THEME_OPTIONS}
      selectedValue={selectedTheme}
      onSelect={onSelectTheme}
    />
  )
}

export type DropdownAction = {
  key: string
  label: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

type DropdownActionsSectionProps = {
  title: ReactNode
  showSeparator?: boolean
  actions: DropdownAction[]
}

export function DropdownActionsSection({
  title,
  showSeparator,
  actions,
}: DropdownActionsSectionProps) {
  return (
    <DropdownUniversalSection title={title} showSeparator={showSeparator}>
      {actions.map((action) => (
        <DropdownItem
          key={action.key}
          onSelect={action.onSelect}
          disabled={action.disabled}
          variant={action.variant ?? 'default'}
        >
          {action.icon ? action.icon : null}
          <span className="ml-1">{action.label}</span>
        </DropdownItem>
      ))}
    </DropdownUniversalSection>
  )
}

const COLOR_VISION_OPTIONS: DropdownOption[] = [
  { value: 'none', label: 'Default', icon: <Eye /> },
  { value: 'deuteranopia', label: 'Deuteranopia', icon: <span className="h-3.5 w-3.5 rounded-full border border-current" style={{ background: 'linear-gradient(135deg, #d4a017 50%, #4a7fb5 50%)' }} /> },
  { value: 'protanopia', label: 'Protanopia', icon: <span className="h-3.5 w-3.5 rounded-full border border-current" style={{ background: 'linear-gradient(135deg, #c4a835 50%, #5b8fbd 50%)' }} /> },
  { value: 'tritanopia', label: 'Tritanopia', icon: <span className="h-3.5 w-3.5 rounded-full border border-current" style={{ background: 'linear-gradient(135deg, #e06070 50%, #40a0a0 50%)' }} /> },
]

type DropdownColorVisionSectionProps = {
  selectedMode: string
  onSelectMode: (mode: string) => void
  withSeparator?: boolean
  title?: ReactNode
}

export function DropdownColorVisionSection({
  selectedMode,
  onSelectMode,
  withSeparator,
  title = 'Color Vision',
}: DropdownColorVisionSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showSeparator={withSeparator}
      options={COLOR_VISION_OPTIONS}
      selectedValue={selectedMode}
      onSelect={onSelectMode}
    />
  )
}

type DropdownColorVisionSubmenuProps = {
  selectedMode: string
  onSelectMode: (mode: string) => void
  label?: ReactNode
}

export function DropdownColorVisionSubmenu({
  selectedMode,
  onSelectMode,
  label = 'Color Vision',
}: DropdownColorVisionSubmenuProps) {
  const currentLabel = COLOR_VISION_OPTIONS.find((o) => o.value === selectedMode)?.label ?? 'Default'
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="group flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-[13px]">
        <span className="flex shrink-0 items-center justify-center text-black/50 dark:text-white/50"><Eye className="h-3.5 w-3.5" /></span>
        <span>{label}</span>
        <span className="ml-auto text-[11px] text-black/40 dark:text-white/40 pr-0.5">{currentLabel}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          className="rounded-lg border-black/10 dark:border-white/10 p-[7px]"
          style={{ width: 210 }}
          sideOffset={8}
          alignOffset={-4}
        >
          {COLOR_VISION_OPTIONS.map((option) => (
            <DropdownUniversalItem
              key={option.value}
              active={selectedMode === option.value}
              onSelect={() => onSelectMode(option.value)}
              icon={option.icon}
            >
              {option.label}
            </DropdownUniversalItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}

type DropdownSidebarPositionSectionProps = {
  selectedSide: string
  onSelectSide: (side: string) => void
  withSeparator?: boolean
  title?: ReactNode
}

const SIDEBAR_POSITION_OPTIONS: DropdownOption[] = [
  { value: 'left', label: 'Left', icon: <PanelLeft /> },
  { value: 'right', label: 'Right', icon: <PanelRight /> },
]

export function DropdownSidebarPositionSection({
  selectedSide,
  onSelectSide,
  withSeparator,
  title = 'Sidebar Position',
}: DropdownSidebarPositionSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showSeparator={withSeparator}
      options={SIDEBAR_POSITION_OPTIONS}
      selectedValue={selectedSide}
      onSelect={onSelectSide}
    />
  )
}