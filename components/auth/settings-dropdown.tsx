'use client'

import type { ReactNode } from 'react'
import {
  Dropdown,
  DropdownUniversalItem,
  DropdownUniversalSection,
  DropdownUniversalShell,
  DropdownTrigger,
} from '@/components/ui/app-dropdown'

type SettingsDropdownProps = {
  children: ReactNode
}

type SettingsDropdownShellProps = {
  children: ReactNode
  className?: string
  width?: number
}

type SettingsDropdownSectionProps = {
  title: string
  children: ReactNode
  showSeparator?: boolean
}

type SettingsDropdownItemProps = {
  active?: boolean
  onSelect?: () => void
  children: ReactNode
}

export function SettingsDropdown({ children }: SettingsDropdownProps) {
  return <Dropdown>{children}</Dropdown>
}

export function SettingsDropdownTrigger({ children }: { children: ReactNode }) {
  return <DropdownTrigger asChild>{children}</DropdownTrigger>
}

export function SettingsDropdownShell({
  children,
  className,
  width = 224,
}: SettingsDropdownShellProps) {
  return (
    <DropdownUniversalShell className={className} width={width}>
      {children}
    </DropdownUniversalShell>
  )
}

export function SettingsDropdownSection({
  title,
  children,
  showSeparator,
}: SettingsDropdownSectionProps) {
  return (
    <DropdownUniversalSection title={title} showSeparator={showSeparator}>{children}</DropdownUniversalSection>
  )
}

export function SettingsDropdownItem({
  active,
  onSelect,
  children,
}: SettingsDropdownItemProps) {
  return (
    <DropdownUniversalItem active={active} onSelect={onSelect}>{children}</DropdownUniversalItem>
  )
}