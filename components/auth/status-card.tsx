import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { PRISM } from '@/lib/PRISM'

type Tone = 'success' | 'error' | 'info'

const toneStyles: Record<Tone, { badge: string; icon: string }> = {
  success: { badge: 'bg-emerald-500/10 border border-emerald-500/20', icon: 'text-emerald-500' },
  error: { badge: 'bg-red-500/10 border border-red-500/20', icon: 'text-red-500' },
  info: { badge: 'bg-blue-500/10 border border-blue-500/20', icon: 'text-blue-500 dark:text-blue-400' },
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
          <h3 className="text-black dark:text-white text-2xl font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-neutral-400 max-w-xs mx-auto">{description}</p>
          )}
        </div>
      </div>

      {children && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  )
}
