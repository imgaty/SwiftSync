//
//  dropdown.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Defines the reusable Dropdown UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
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
import { UDS } from '@/lib/UDS'
import { LANGUAGE_OPTIONS } from '@/lib/languages'
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
  const showsActiveIndicator = typeof active === 'boolean'

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
      {showsActiveIndicator ? (
        <Check
          aria-hidden="true"
          className={cn(
            "ml-auto size-4 shrink-0 transition-opacity",
            active ? "opacity-100 !text-black dark:!text-white" : "opacity-0"
          )}
        />
      ) : null}
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
              <span className="text-xs text-neutral-400">{option.description}</span>
            ) : null}
          </span>
        </DropdownSectionItem>
      ))}
    </DropdownSection>
  )
}

const DROPDOWN_LANGUAGE_OPTIONS: DropdownOption[] = LANGUAGE_OPTIONS.map((language) => ({
  ...language,
  icon: <Globe />,
}))

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
      options={DROPDOWN_LANGUAGE_OPTIONS}
      selectedValue={selectedLanguage}
      onSelect={onSelectLanguage}
    />
  )
}

type DropdownLanguageSubmenuProps = {
  selectedLanguage: string
  onSelectLanguage: (language: string) => void
  label?: ReactNode
}

export function DropdownLanguageSubmenu({
  selectedLanguage,
  onSelectLanguage,
  label = 'Language',
}: DropdownLanguageSubmenuProps) {
  const currentLabel = DROPDOWN_LANGUAGE_OPTIONS.find((option) => option.value === selectedLanguage)?.label ?? selectedLanguage
  const languageLabel = typeof label === 'string' ? label : 'Language'
  const currentLabelText = typeof currentLabel === 'string' ? currentLabel : selectedLanguage

  return (
    <DropdownSub>
      <DropdownSubTrigger className="group cursor-pointer" aria-label={`${languageLabel}: ${currentLabelText}`}>
        <span className="flex shrink-0 items-center justify-center text-neutral-400">
          <Globe className="size-4" />
        </span>
        <span>{currentLabel}</span>
      </DropdownSubTrigger>
      <DropdownPortal>
        <DropdownSubContent
          className="max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
          style={{ width: 240 }}
          sideOffset={8}
          alignOffset={-4}
        >
          {DROPDOWN_LANGUAGE_OPTIONS.map((option) => (
            <DropdownSectionItem
              key={option.value}
              active={selectedLanguage === option.value}
              onSelect={() => onSelectLanguage(option.value)}
              icon={option.icon}
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="truncate text-xs text-neutral-400">{option.description}</span>
                ) : null}
              </span>
            </DropdownSectionItem>
          ))}
        </DropdownSubContent>
      </DropdownPortal>
    </DropdownSub>
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
  { value: 'deuteranopia', label: 'Deuteranopia', icon: <span className={cn("size-3.5 ring-1 ring-current", UDS.radius.full)} style={{ background: 'linear-gradient(135deg, #d4a017 50%, #4a7fb5 50%)' }} /> },
  { value: 'protanopia', label: 'Protanopia', icon: <span className={cn("size-3.5 ring-1 ring-current", UDS.radius.full)} style={{ background: 'linear-gradient(135deg, #c4a835 50%, #5b8fbd 50%)' }} /> },
  { value: 'tritanopia', label: 'Tritanopia', icon: <span className={cn("size-3.5 ring-1 ring-current", UDS.radius.full)} style={{ background: 'linear-gradient(135deg, #e06070 50%, #40a0a0 50%)' }} /> },
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
      <DropdownSubTrigger className="group cursor-pointer">
        <span className="flex shrink-0 items-center justify-center text-neutral-400">
          <Eye className="size-4" />
        </span>
        <span>{label}</span>
        <span className="ml-auto pr-0.5 text-xs text-neutral-400">{currentLabel}</span>
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
