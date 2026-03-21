import { memo, useMemo } from 'react'

const STRENGTH_COLORS = ['text-red-500 dark:text-red-400', 'text-amber-500 dark:text-amber-400', 'text-emerald-500 dark:text-emerald-400']
const STRENGTH_LABELS = ['Weak', 'Medium', 'Strong']
const BAR_COLORS = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500']

const checks = [
  { test: (p: string) => p.length >= 8, label: '8+' },
  { test: (p: string) => /[a-zA-Z]/.test(p), label: 'Aa' },
  { test: (p: string) => /\d/.test(p), label: '1' },
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

  return (
    <div className={`flex items-center gap-2 mt-2 ml-1 transition-all duration-300 ${password ? 'opacity-100 max-h-6' : 'opacity-0 max-h-0'} overflow-hidden`}>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(level => (
          <div
            key={level}
            className={`w-5 h-1 rounded-full transition-all duration-500 ${
              strength >= level ? `${BAR_COLORS[level - 1]} scale-100` : 'bg-black/10 dark:bg-white/10 scale-90'
            }`}
          />
        ))}
      </div>
      <span className={`text-[11px] font-medium transition-colors duration-300 ${strength > 0 ? STRENGTH_COLORS[strength - 1] : STRENGTH_COLORS[0]}`}>
        {strength > 0 ? STRENGTH_LABELS[strength - 1] : STRENGTH_LABELS[0]}
      </span>
      <div className="flex gap-1 ml-auto">
        {checks.map((c, i) => (
          <span
            key={c.label}
            className={`text-[10px] font-mono w-5 h-4 flex items-center justify-center rounded transition-all duration-300 ${
              checkResults[i]
                ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'
                : 'bg-black/5 dark:bg-white/5 text-neutral-400 dark:text-neutral-600'
            }`}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
})
