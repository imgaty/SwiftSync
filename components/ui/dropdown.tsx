'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Check, Eye, Globe, Monitor, Moon, PanelLeft, PanelRight, Sun } from 'lucide-react'
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

export type DropdownOption = {
  value: string
  label: ReactNode
  icon?: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export type DropdownAction = {
  key: string
  label: ReactNode
  icon?: ReactNode
  onSelect?: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

type DropdownContentProps = ComponentProps<typeof DropdownMenuContent> & {
  width?: number
}

export function DropdownContent({
  children,
  className,
  width = 220,
  align = 'end',
  sideOffset = 6,
  style,
  ...props
}: DropdownContentProps) {
  return (
    <DropdownMenuContent
      align={align}
      sideOffset={sideOffset}
      className={cn(className)}
      style={{ width, ...style }}
      {...props}
    >
      {children}
    </DropdownMenuContent>
  )
}

type DropdownSectionProps = {
  title?: ReactNode
  children: ReactNode
  showTitle?: boolean
  showSeparator?: boolean
}

export function DropdownSection({
  title,
  children,
  showTitle = true,
  showSeparator,
}: DropdownSectionProps) {
  return (
    <>
      {showTitle && title ? (
          <DropdownLabel>{title}</DropdownLabel>
      ) : null}
      {children}
      {showSeparator ? <DropdownSeparator /> : null}
    </>
  )
}

type DropdownSectionItemProps = {
  active?: boolean
  onSelect?: () => void
  children: ReactNode
  icon?: ReactNode
}

export function DropdownSectionItem({
  active,
  onSelect,
  children,
  icon,
}: DropdownSectionItemProps) {
  return (
    <DropdownItem
      onSelect={onSelect}
    >
      {icon ? (
        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <span className="auto-scroll flex-1 min-w-0">{children}</span>
      <span className="ml-auto flex size-4 shrink-0 items-center justify-center">
        {active ? <Check className="size-4" /> : null}
      </span>
    </DropdownItem>
  )
}

type DropdownOptionsSectionProps = Omit<DropdownSectionProps, 'children'> & {
  options: DropdownOption[]
  selectedValue?: string
  onSelect: (value: string) => void
}

export function DropdownOptionsSection({
  title,
  showTitle = true,
  showSeparator,
  options,
  selectedValue,
  onSelect,
}: DropdownOptionsSectionProps) {
  return (
    <DropdownSection title={title} showTitle={showTitle} showSeparator={showSeparator}>
      {options.map((option) => (
        <DropdownSectionItem
          key={option.value}
          active={selectedValue === option.value}
          onSelect={() => onSelect(option.value)}
          icon={option.icon}
        >
          <span className="flex items-center gap-1">
            <span>{option.label}</span>
            {option.description ? (
              <span className="text-[11px] text-neutral-400">{option.description}</span>
            ) : null}
          </span>
        </DropdownSectionItem>
      ))}
    </DropdownSection>
  )
}

const LANGUAGE_OPTIONS: DropdownOption[] = [
  { value: 'en', label: 'English', icon: <Globe /> },
  { value: 'pt', label: 'Português', icon: <Globe /> },
]

type DropdownLanguageSectionProps = {
  selectedLanguage: string
  onSelectLanguage: (language: string) => void
  withSeparator?: boolean
  title?: ReactNode
  showTitle?: boolean
}

export function DropdownLanguageSection({
  selectedLanguage,
  onSelectLanguage,
  withSeparator,
  title = 'Language',
  showTitle = true,
}: DropdownLanguageSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showTitle={showTitle}
      showSeparator={withSeparator}
      options={LANGUAGE_OPTIONS}
      selectedValue={selectedLanguage}
      onSelect={onSelectLanguage}
    />
  )
}

const THEME_OPTIONS: DropdownOption[] = [
  { value: 'light', label: 'Light', icon: <Sun /> },
  { value: 'dark', label: 'Dark', icon: <Moon /> },
  { value: 'system', label: 'System', icon: <Monitor /> },
]

type DropdownThemeSectionProps = {
  selectedTheme?: string
  onSelectTheme: (theme: string) => void
  withSeparator?: boolean
  title?: ReactNode
  showTitle?: boolean
}

export function DropdownThemeSection({
  selectedTheme,
  onSelectTheme,
  withSeparator,
  title = 'Theme',
  showTitle = true,
}: DropdownThemeSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showTitle={showTitle}
      showSeparator={withSeparator}
      options={THEME_OPTIONS}
      selectedValue={selectedTheme}
      onSelect={onSelectTheme}
    />
  )
}

type DropdownActionsSectionProps = {
  title?: ReactNode
  showTitle?: boolean
  showSeparator?: boolean
  actions: DropdownAction[]
}

export function DropdownActionsSection({
  title,
  showTitle = true,
  showSeparator,
  actions,
}: DropdownActionsSectionProps) {
  return (
    <DropdownSection title={title} showTitle={showTitle} showSeparator={showSeparator}>
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
    </DropdownSection>
  )
}

export function DropdownSettingsSection({
  actions,
  title = 'Settings',
  showTitle = true,
  showSeparator,
}: DropdownActionsSectionProps) {
  return (
    <DropdownActionsSection
      actions={actions}
      title={title}
      showTitle={showTitle}
      showSeparator={showSeparator}
    />
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
  showTitle?: boolean
}

export function DropdownColorVisionSection({
  selectedMode,
  onSelectMode,
  withSeparator,
  title = 'Color Vision',
  showTitle = true,
}: DropdownColorVisionSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showTitle={showTitle}
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
  const currentLabel = COLOR_VISION_OPTIONS.find((option) => option.value === selectedMode)?.label ?? 'Default'

  return (
    <DropdownSub>
      <DropdownSubTrigger className="group flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-2 text-[13px]">
        <span className="flex shrink-0 items-center justify-center text-neutral-400">
          <Eye className="h-3.5 w-3.5" />
        </span>
        <span>{label}</span>
        <span className="ml-auto pr-0.5 text-[11px] text-neutral-400">{currentLabel}</span>
      </DropdownSubTrigger>
      <DropdownPortal>
        <DropdownSubContent
          style={{ width: 210 }}
          sideOffset={8}
          alignOffset={-4}
        >
          {COLOR_VISION_OPTIONS.map((option) => (
            <DropdownSectionItem
              key={option.value}
              active={selectedMode === option.value}
              onSelect={() => onSelectMode(option.value)}
              icon={option.icon}
            >
              {option.label}
            </DropdownSectionItem>
          ))}
        </DropdownSubContent>
      </DropdownPortal>
    </DropdownSub>
  )
}

const SIDEBAR_POSITION_OPTIONS: DropdownOption[] = [
  { value: 'left', label: 'Left', icon: <PanelLeft /> },
  { value: 'right', label: 'Right', icon: <PanelRight /> },
]

type DropdownSidebarPositionSectionProps = {
  selectedSide: string
  onSelectSide: (side: string) => void
  withSeparator?: boolean
  title?: ReactNode
  showTitle?: boolean
}

export function DropdownSidebarPositionSection({
  selectedSide,
  onSelectSide,
  withSeparator,
  title = 'Sidebar Position',
  showTitle = true,
}: DropdownSidebarPositionSectionProps) {
  return (
    <DropdownOptionsSection
      title={title}
      showTitle={showTitle}
      showSeparator={withSeparator}
      options={SIDEBAR_POSITION_OPTIONS}
      selectedValue={selectedSide}
      onSelect={onSelectSide}
    />
  )
}

// Compatibility aliases for existing imports.
export const DropdownShell = DropdownContent
export const DropdownChild = DropdownSection
export const DropdownUniversalShell = DropdownContent
export const DropdownUniversalSection = DropdownSection
export const DropdownUniversalItem = DropdownSectionItem
