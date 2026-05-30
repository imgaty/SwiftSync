//
//  back-button.tsx
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Implements the Back button auth component for Argent, supporting sign-in, registration,
//  recovery, or security flows with reusable presentation logic.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  label: string
  disabled?: boolean
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

export function BackButton({ label, disabled, href, onClick }: Props) {
  // `href` variant renders as a link styled exactly like the Button so it
  // stretches to full width the same way the `onClick` variant does —
  // no nested anchor/button markup where the Button's `w-full` depends on the
  // <a> being a flex child that happens to stretch.
  if (href) {
    return (
      <Button asChild variant="glass" size="lg" className="w-full">
        <Link href={href} aria-disabled={disabled}>
          <ArrowLeft className="w-4 h-4" />
          {label}
        </Link>
      </Button>
    )
  }

  return (
    <Button type="button" variant="glass" size="lg" className="w-full" disabled={disabled} onClick={onClick}>
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  )
}
