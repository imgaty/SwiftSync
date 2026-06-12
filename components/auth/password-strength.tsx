//
//  password-strength.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Implements the Password strength auth component for Argent, supporting sign-in,
//  registration, recovery, or security flows with reusable presentation logic.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

const STRENGTH_STATES = [
  {
    label: 'Weak',
    textClass: 'text-red-600 dark:text-red-400',
    barClass: 'bg-red-500',
  },
  {
    label: 'Medium',
    textClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'bg-amber-500',
  },
  {
    label: 'Strong',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
  },
] as const

const checks = [
  { test: (p: string) => p.length >= 12, label: '12+', description: '12 or more characters' },
  { test: (p: string) => /[a-zA-Z]/.test(p), label: 'Aa', description: 'Contains a letter' },
  { test: (p: string) => /\d/.test(p), label: '1', description: 'Contains a number' },
] as const

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const results = checks.map(c => c.test(password))
    const strength = results.filter(Boolean).length
    return {
      strength,
      results,
      checks: { length: results[0], hasLetter: results[1], hasNumber: results[2] },
      allPassed: results.every(Boolean),
    }
  }, [password])
}

export const PasswordStrength = memo(function PasswordStrength({ password, strength, results }: { password: string; strength: number; results?: boolean[] }) {
  // Use provided results from hook, or compute as fallback
  const checkResults = results ?? checks.map(c => c.test(password))
  const activeState = STRENGTH_STATES[Math.max(0, Math.min(strength, STRENGTH_STATES.length) - 1)]

  return (
    <div
      aria-live="polite"
      aria-label={`Password strength ${activeState.label}. ${checks.map((check, index) => `${check.description}: ${checkResults[index] ? 'done' : 'needed'}`).join('. ')}`}
      className={cn(
        "mt-2 ml-1 flex h-6 items-center gap-2 overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out",
        password ? "max-h-6 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0 pointer-events-none",
      )}
    >
      <div className="flex shrink-0 items-center gap-1" aria-hidden="true">
        {checks.map((check, index) => (
          <div
            key={check.label}
            className={cn(
              "h-1.5 w-6 sq-full transition-[background-color,opacity,transform] duration-300 ease-out",
              index < strength ? activeState.barClass : "scale-95 bg-black/[0.08] opacity-80 dark:bg-white/[0.10]",
            )}
          />
        ))}
      </div>

      <span className={cn("shrink-0 text-xs font-semibold leading-none transition-colors duration-300", activeState.textClass)}>
        {activeState.label}
      </span>

      <div className="ml-auto flex min-w-0 items-center gap-1">
        {checks.map((check, index) => {
          const passed = checkResults[index]

          return (
            <span
              key={check.label}
              title={`${check.description}: ${passed ? 'done' : 'needed'}`}
              className={cn(
                "flex h-5 min-w-5 items-center justify-center sq-full px-1.5 text-xs font-semibold leading-none tabular-nums transition-[background-color,border-color,color,opacity] duration-300",
                passed
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border border-border/70 bg-black/[0.035] text-muted-foreground/75 dark:bg-white/[0.06]",
              )}
            >
              {check.label}
            </span>
          )
        })}
      </div>
    </div>
  )
})
