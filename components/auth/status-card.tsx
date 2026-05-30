//
//  status-card.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Status card auth component for Argent, supporting sign-in, registration,
//  recovery, or security flows with reusable presentation logic.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { PRISM } from '@/lib/PRISM'

type Tone = 'success' | 'error' | 'info'

const toneStyles: Record<Tone, { badge: string; icon: string }> = {
  success: { badge: 'bg-emerald-500/10 border border-emerald-500/20', icon: 'text-emerald-500' },
  error: { badge: 'bg-red-500/10 border border-red-500/20', icon: 'text-red-500' },
  info: { badge: 'bg-[var(--surface)] border border-[color:var(--border-strong)]', icon: 'text-foreground-secondary' },
}

export function StatusCard({
  tone,
  icon: Icon,
  title,
  description,
  children,
}: {
  tone: Tone
  icon: LucideIcon
  title: string
  description?: ReactNode
  children?: ReactNode
}) {
  const { badge, icon } = toneStyles[tone]

  return (
    <div className="flex flex-col gap-8 animate-slide-in-right">
      <div className="flex flex-col items-center gap-8">
        <div className={`${PRISM.iconBadge} ${badge}`}>
          <Icon className={`w-7 h-7 ${icon}`} />
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h3 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm leading-5 text-muted-foreground max-w-xs mx-auto">{description}</p>
          )}
        </div>
      </div>

      {children && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  )
}
