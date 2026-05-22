import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BTN_OUTLINE } from './styles'

type Props = {
  label: string
  disabled?: boolean
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

export function BackButton({ label, disabled, href, onClick }: Props) {
  // `href` variant renders as a link styled exactly like the Button so it
  // stretches to full width the same way the `onClick` variant does —
  // no nested <a><button> where the Button's `w-full` depends on the
  // <a> being a flex child that happens to stretch.
  if (href) {
    return (
      <Button asChild variant="glass" size="lg" className={BTN_OUTLINE}>
        <Link href={href} aria-disabled={disabled}>
          <ArrowLeft className="w-4 h-4" />
          {label}
        </Link>
      </Button>
    )
  }

  return (
    <Button type="button" variant="glass" size="lg" className={BTN_OUTLINE} disabled={disabled} onClick={onClick}>
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  )
}
