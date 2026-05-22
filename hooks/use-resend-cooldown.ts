'use client'

import { useEffect, useState, useCallback } from 'react'

// Counts down a "wait N seconds before you can resend" timer. Used by login
// (2FA code) and forgot-password (reset link). Pauses cleanly on unmount.
//
// Usage:
//   const { remaining, start, isCoolingDown } = useResendCooldown(30)
//   <button disabled={isCoolingDown} onClick={() => { send(); start() }}>
//     {isCoolingDown ? `Resend (${remaining}s)` : 'Resend'}
//   </button>
export function useResendCooldown(initialSeconds = 30) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  const start = useCallback(
    (seconds: number = initialSeconds) => setRemaining(seconds),
    [initialSeconds],
  )

  return { remaining, start, isCoolingDown: remaining > 0 }
}
