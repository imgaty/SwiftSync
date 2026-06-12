//
//  page.tsx
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Renders the /register route in Argent, composing page-level layout, data dependencies,
//  and feature components for that user-facing screen.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { OAuthButtons } from '@/components/oauth-buttons'
import { DatePicker } from '@/components/date-picker'
import {
  AuthShell,
  AuthHeader,
  BackButton,
  ErrorAlert,
  PasswordStrength,
  usePasswordStrength,
} from '@/components/auth'
import { UDS } from '@/lib/UDS'
import { cn } from '@/lib/utils'
import { postAuth } from '@/lib/auth-fetch'
import { EMAIL_RE } from '@/lib/validation'

import { Loader2, ArrowRight, Building2 } from 'lucide-react'
import { useLanguage, useTranslationNamespace } from '@/components/language-provider'

/* ─── Constants ─────────────────────────────────────────────────────── */
const FORM_STEPS = ['email', 'details', 'password', 'security'] as const
const TOTAL_STEPS = FORM_STEPS.length

/* ─── Step indicator ─────────────────────────────────────────────── */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-[5px] sq-full transition-all duration-300 ease-out",
            i <= current ? "w-10" : "w-6",
            i < current && "bg-primary",
            i === current && "bg-primary",
            i > current && UDS.subtleFill,
          )}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */

export default function RegisterPage() {
  const { language, t } = useLanguage()
  const re = useTranslationNamespace('register_page_extra')

  /* form fields */
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  /* security toggles */
  const [enableRecoveryEmail, setEnableRecoveryEmail] = useState(false)

  /* ui state */
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [accountCreated, setAccountCreated] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const currentStep = FORM_STEPS[stepIndex]
  const { strength: passwordStrength, results: passwordResults, allPassed } = usePasswordStrength(password)

  /* ── Navigation helpers ──────────────────────────────────────────── */
  const goNext = useCallback(() => {
    setError('')
    setDirection('forward')
    setStepIndex(i => Math.min(i + 1, TOTAL_STEPS - 1))
  }, [])

  const goBack = useCallback(() => {
    setError('')
    setDirection('back')
    setStepIndex(i => Math.max(i - 1, 0))
  }, [])

  /* ── Per-step validation & advance ───────────────────────────────── */
  const handleNext = useCallback(async () => {
    setError('')
    if (currentStep === 'email') {
      if (!email) { setError(re.error_enter_email || 'Please enter your email address.'); return }
      if (!EMAIL_RE.test(email)) { setError(re.error_valid_email || 'Please enter a valid email address.'); return }

      // Check if email is already taken
      setLoading(true)
      try {
        const { ok, data } = await postAuth<{ error?: string }>('/api/auth/check-email', { email })
        if (!ok) { setError(data.error || (re.error_email_exists || 'An account with this email already exists.')); return }
        goNext()
      } catch (e) {
        setError(e instanceof Error ? e.message : (re.error_check_email_unknown || 'Unknown error while checking email.'))
      } finally {
        setLoading(false)
      }

      return
    } else if (currentStep === 'details') {
      if (!name) { setError(re.error_enter_name || 'Please enter your full name.'); return }
      if (!dateOfBirth) { setError(re.error_enter_dob || 'Please enter your date of birth.'); return }
      goNext()
    } else if (currentStep === 'password') {
      if (!password || !confirmPassword) { setError(re.error_fill_passwords || 'Please fill in both password fields.'); return }
      if (!allPassed) { setError(re.error_password_requirements || 'Password must be at least 12 characters and include a letter and a number.'); return }
      if (password !== confirmPassword) { setError(re.error_passwords_dont_match || 'Passwords do not match.'); return }
      goNext()
    }
  }, [currentStep, email, name, dateOfBirth, password, confirmPassword, allPassed, goNext, re])

  const startBankConnection = useCallback(async () => {
    const returnTo = `${window.location.origin}/connect-bank/callback?redirect=%2F`
    const { ok, data } = await postAuth<{ error?: string; connectUrl?: string }>('/api/bank/connect', {
      returnTo,
      action: 'connect',
    })

    if (!ok || !data.connectUrl) {
      throw new Error(data.error || (re.error_connect_session || 'Failed to create connect session'))
    }

    window.location.assign(data.connectUrl)
  }, [re.error_connect_session])

  /* ── Final submit (create account + bank connection) ──────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (enableRecoveryEmail && recoveryEmail && !EMAIL_RE.test(recoveryEmail)) {
      setError(re.error_valid_recovery_email || 'Please enter a valid recovery email address.'); return
    }

    setLoading(true)
    let createdForThisAttempt = accountCreated
    try {
      if (!accountCreated) {
        const { ok, data } = await postAuth<{ error?: string }>('/api/auth/register', {
          name,
          email,
          dateOfBirth,
          password,
          recoveryEmail: (enableRecoveryEmail && recoveryEmail) || undefined,
        }, { withCredentials: true })

        if (!ok) {
          setError(data.error || (re.error_registration_failed || 'Registration failed'))
          return
        }

        setAccountCreated(true)
        createdForThisAttempt = true
      }

      await startBankConnection()
    } catch (e) {
      setError(
        createdForThisAttempt
          ? e instanceof Error ? e.message : (re.error_connection_failed || 'Connection failed')
          : e instanceof Error ? e.message : (re.error_registration_unknown || 'Unknown error during registration.')
      )
    } finally {
      setLoading(false)
    }
  }

  /* ── Slide animation class ──────────────────────────────────────── */
  const slideClass =
    direction === 'forward'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left'

  /* ═════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════ */
  return (
    <AuthShell>
      <>
          <AuthHeader page="register" registerSubtitleKey={`subtitle_${currentStep}`} />

          <form
            onSubmit={currentStep === 'security' ? handleSubmit : (e) => { e.preventDefault(); handleNext() }}
            noValidate
            className="space-y-4"
          >

            <ErrorAlert message={error} />

            {/* ── Step 1: Email ────────────────────────────────────── */}
            {currentStep === 'email' && (
              <div key="step-email" className={slideClass}>
                <div className="space-y-4">
                  <Input
                    id="email"
                    type="email"
                    label="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                    required
                  />

                  <Button type="submit" variant="solid" size="lg" className="auth-primary-button w-full" disabled={loading}>
                    {loading
                      ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Checking...</>
                      : <>Continue<ArrowRight className="w-4 h-4" /></>}
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className={UDS.dividerLine} />
                    <span className={UDS.dividerLabel}>{t.oauth_buttons?.divider_label ?? 'or'}</span>
                    <div className={UDS.dividerLine} />
                  </div>

                  <div className="pb-2"><OAuthButtons mode="register" /></div>

                  <p className="text-sm text-center text-neutral-400 pt-2">
                    Already have an account?{' '}<Link href="/login">Sign in</Link>
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 2: Name & Date of Birth ────────────────────── */}
            {currentStep === 'details' && (
              <div key="step-details" className={slideClass}>
                <div className="space-y-4">
                  <Input
                    id="name"
                    type="text"
                    label="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={loading}
                    autoFocus
                    required
                  />

                  <DatePicker
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    locale={language}
                    disabled={loading}
                    placeholder="Date of Birth"
                    dobMode
                  />

                  <Button type="submit" variant="solid" size="lg" className="auth-primary-button w-full" disabled={loading}>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <BackButton onClick={goBack} label="Back" />
                </div>
              </div>
            )}

            {/* ── Step 3: Password ────────────────────────────────── */}
            {currentStep === 'password' && (
              <div key="step-password" className={slideClass}>
                <div className="space-y-4">
                  <div>
                    <Input
                      id="password"
                      type="password"
                      label="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={loading}
                      autoFocus
                      required
                    />
                    <PasswordStrength password={password} strength={passwordStrength} results={passwordResults} />
                  </div>

                  <div>
                    <Input
                      id="confirmPassword"
                      type="password"
                      label="Confirm Password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      className={confirmPassword && password !== confirmPassword ? UDS.destructiveValidation : ''}
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400 mt-1 ml-1">Passwords don&apos;t match</p>
                    )}
                  </div>

                  <Button type="submit" variant="solid" size="lg" className="auth-primary-button w-full" disabled={loading || (!!password && !allPassed)}>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <BackButton onClick={goBack} label="Back" />
                </div>
              </div>
            )}

            {/* ── Step 4: Security (Optional) ─────────────────────── */}
            {currentStep === 'security' && (
              <div key="step-security" className={slideClass}>
                <div className="space-y-4">
                  <div className="w-full">
                    <div className="flex min-h-8 items-center justify-between gap-4">
                      <label htmlFor="enableRecoveryEmail" className="min-w-0 flex-1 cursor-pointer text-left text-sm font-medium text-neutral-400 transition-colors hover:text-foreground">
                        Add recovery email
                      </label>
                      <Checkbox
                        id="enableRecoveryEmail"
                        checked={enableRecoveryEmail}
                        onCheckedChange={checked => setEnableRecoveryEmail(checked === true)}
                        disabled={loading}
                        data-squircle-expand-radius="false"
                        className="size-5 !border-[color:color-mix(in_srgb,var(--foreground)_28%,transparent)] !bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)] !text-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:!border-[color:color-mix(in_srgb,var(--foreground)_44%,transparent)] hover:!bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)] data-[state=checked]:!border-foreground data-[state=checked]:!bg-foreground data-[state=checked]:!text-background data-[state=checked]:shadow-[0_8px_22px_rgba(0,0,0,0.24)]"
                        style={{
                          "--sq-static-r": "4px",
                          "--sq-base-r": "4px",
                          "--sq-scale": "0",
                        } as React.CSSProperties}
                      />
                    </div>

                    <div
                      aria-hidden={!enableRecoveryEmail}
                      className={cn(
                        "transition-[max-height,margin-top,opacity,transform] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                        enableRecoveryEmail ? "mt-3 max-h-24 translate-y-0 overflow-visible opacity-100" : "pointer-events-none mt-0 max-h-0 -translate-y-1 overflow-hidden opacity-0",
                      )}
                    >
                      <Input
                        id="recoveryEmail"
                        type="email"
                        label="Recovery Email"
                        value={recoveryEmail}
                        onChange={e => setRecoveryEmail(e.target.value)}
                        disabled={loading || !enableRecoveryEmail}
                      />
                    </div>
                  </div>

                  <Button type="submit" variant="solid" size="lg" className="auth-primary-button w-full" disabled={loading}>
                    {loading
                      ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Opening bank setup...</>
                      : accountCreated
                        ? <><Building2 className="w-4 h-4" />Connect bank</>
                        : <><Building2 className="w-4 h-4" />Create &amp; connect bank</>}
                  </Button>
                  <BackButton onClick={goBack} label="Back" />
                </div>
              </div>
            )}

            {/* ── Progress dots ────────────────────────────────────── */}
            <StepIndicator current={stepIndex} total={TOTAL_STEPS} />
          </form>
        </>
    </AuthShell>
  )
}
