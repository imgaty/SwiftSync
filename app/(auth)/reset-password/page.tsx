'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthShell, AuthHeader, ErrorAlert, PasswordStrength, usePasswordStrength } from '@/components/auth'
import { BTN_PRIMARY, BTN_OUTLINE, ICON_BADGE } from '@/lib/styles'
import { Loader2, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function postAuth<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Network error — check your internet connection.')
  }

  let data: T
  try {
    data = await res.json() as T
  } catch {
    throw new Error(`Server returned ${res.status} with no JSON body.`)
  }

  return { ok: res.ok, data }
}

function ResetPasswordForm() {
  const token = useSearchParams().get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { strength: passwordStrength, results: passwordResults, allPassed } = usePasswordStrength(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!password || !confirmPassword) { setError('Both fields are required'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!allPassed) { setError('Password does not meet requirements'); return }

    setLoading(true)
    try {
      const { ok, data } = await postAuth<{ error?: string }>('/api/auth/reset-password', { token, password })
      if (!ok) { setError(data.error || 'Password reset failed. Please try again.'); return }
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error during password reset.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 py-8 animate-slide-in-right">
          <div className={`${ICON_BADGE} bg-red-500/10 border border-red-500/20`}>
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-[17px] font-semibold text-black dark:text-white">Invalid reset link</h3>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">This password reset link is invalid or has expired.</p>
          </div>
          <Link href="/forgot-password" className="mt-2">
            <Button variant="outline" className={`${BTN_OUTLINE} w-auto px-6`}>
              Request a new link
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeader page="reset_password" />

      {success ? (
        <div className="space-y-4 animate-slide-in-right">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className={`${ICON_BADGE} bg-emerald-500/10 border border-emerald-500/20`}>
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-[17px] font-semibold text-black dark:text-white">Password reset!</h3>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Your password has been updated. You can now sign in.</p>
            </div>
          </div>
          <Link href="/login" className="block">
            <Button className={BTN_PRIMARY}>
              Sign in<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 animate-slide-in-right">
          <ErrorAlert message={error} />

          <div>
            <Input id="password" type="password" label="New password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
            <PasswordStrength password={password} strength={passwordStrength} results={passwordResults} />
          </div>

          <div>
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
              className={confirmPassword && !passwordsMatch ? 'border-red-500/50! ring-red-500/20!' : ''}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-red-500 dark:text-red-400 ml-1 mt-1.5">Passwords do not match</p>
            )}
          </div>

          <div className="space-y-4">
            <Button type="submit" className={BTN_PRIMARY} disabled={loading || !passwordsMatch || !allPassed}>
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Resetting...</> : <>Reset password<ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" /></>}
            </Button>
            <Link href="/login" className="block">
              <Button type="button" variant="outline" className={`${BTN_OUTLINE} group/back`}>
                <ArrowLeft className="w-4 h-4 mr-2 transition-transform duration-200 group-hover/back:-translate-x-1" />Back to login
              </Button>
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-neutral-400" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
