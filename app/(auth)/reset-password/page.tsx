'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AuthShell,
  AuthHeader,
  BackButton,
  StatusCard,
  ErrorAlert,
  PasswordStrength,
  usePasswordStrength,
  BTN_PRIMARY,
} from '@/components/auth'
import { PRISM } from '@/lib/PRISM'
import { postAuth } from '@/lib/auth-fetch'
import { Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslationNamespace } from '@/components/language-provider'

function ResetPasswordForm() {
  const token = useSearchParams().get('token')
  const rp = useTranslationNamespace('reset_password_page_extra')
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
    if (!password || !confirmPassword) { setError(rp.error_both_required || 'Both fields are required'); return }
    if (password !== confirmPassword) { setError(rp.error_passwords_dont_match || 'Passwords do not match'); return }
    if (!allPassed) { setError(rp.error_password_requirements || 'Password does not meet requirements'); return }

    setLoading(true)
    try {
      const { ok, data } = await postAuth<{ error?: string }>('/api/auth/reset-password', { token, password })
      if (!ok) { setError(data.error || (rp.error_reset_failed || 'Password reset failed. Please try again.')); return }
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : (rp.error_unknown || 'Unknown error during password reset.'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <StatusCard
          tone="error"
          icon={AlertCircle}
          title={rp.invalid_link || 'Invalid reset link'}
          description={rp.invalid_link_desc || 'This password reset link is invalid or has expired.'}
        >
          <BackButton href="/forgot-password" label={rp.request_new_link || 'Request a new link'} />
        </StatusCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      {success ? (
        <StatusCard
          tone="success"
          icon={CheckCircle2}
          title={rp.password_reset_success || 'Password reset!'}
          description={rp.password_reset_desc || 'Your password has been updated. You can now sign in.'}
        >
          <Link href="/login" className="block">
            <Button variant="solid" size="lg" className={BTN_PRIMARY}>
              {rp.sign_in || 'Sign in'}<ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </StatusCard>
      ) : (
        <>
          <AuthHeader page="reset_password" />

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
                className={confirmPassword && !passwordsMatch ? PRISM.destructiveValidation : ''}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-[11px] text-red-500 dark:text-red-400 ml-1 mt-1.5">{rp.error_passwords_dont_match || 'Passwords do not match'}</p>
              )}
            </div>

            <div className="space-y-4">
              <Button type="submit" variant="solid" size="lg" className={BTN_PRIMARY} disabled={loading || !passwordsMatch || !allPassed}>
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{rp.resetting || 'Resetting...'}</> : <>{rp.reset_password || 'Reset password'}<ArrowRight className="w-4 h-4" /></>}
              </Button>
              <BackButton href="/login" label={rp.back_to_login || 'Back to login'} />
            </div>
          </form>
        </>
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
