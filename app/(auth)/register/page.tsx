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
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
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

import { Loader2, ArrowRight, Building2, CheckCircle2, Shield, ShieldCheck, Smartphone, Copy } from 'lucide-react'
import { useLanguage, useTranslationNamespace } from '@/components/language-provider'
import { toast } from 'sonner'

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
  const [enable2FA, setEnable2FA] = useState(false)

  /* 2FA setup state */
  const [twoFAStep, setTwoFAStep] = useState(false)
  const [setupState, setSetupState] = useState<'idle' | 'loading' | 'scanning' | 'verifying'>('idle')
  const [is2FAVerifying, setIs2FAVerifying] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [copied, setCopied] = useState(false)

  /* ui state */
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [bankStep, setBankStep] = useState(false)
  const [isConnectingBank, setIsConnectingBank] = useState(false)
  const [connectError, setConnectError] = useState('')
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
      if (!allPassed) { setError(re.error_password_requirements || 'Password does not meet the requirements.'); return }
      if (password !== confirmPassword) { setError(re.error_passwords_dont_match || 'Passwords do not match.'); return }
      goNext()
    }
  }, [currentStep, email, name, dateOfBirth, password, confirmPassword, allPassed, goNext, re])

  /* ── Final submit (security step) ─────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (enableRecoveryEmail && recoveryEmail && !EMAIL_RE.test(recoveryEmail)) {
      setError(re.error_valid_recovery_email || 'Please enter a valid recovery email address.'); return
    }

    setLoading(true)
    try {
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

      if (enable2FA) {
        setTwoFAStep(true)
        start2FASetup()
      } else {
        setBankStep(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : (re.error_registration_unknown || 'Unknown error during registration.'))
    } finally {
      setLoading(false)
    }
  }

  /* ── 2FA setup handlers ──────────────────────────────────────────── */
  const start2FASetup = useCallback(async () => {
    setSetupState('loading')
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || (re.error_2fa_setup || 'Failed to set up 2FA'))
        setSetupState('idle')
        return
      }
      const data = await res.json()
      setSecret(data.secret)
      const QRCode = await import('qrcode')
      const toDataURL = QRCode.toDataURL || QRCode.default?.toDataURL
      const url = await toDataURL(data.otpauthUrl, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      setQrDataUrl(url)
      setSetupState('scanning')
    } catch {
      toast.error(re.error_2fa_setup || 'Failed to set up 2FA')
      setSetupState('idle')
    }
  }, [re.error_2fa_setup])

  const handleVerify2FA = useCallback(async () => {
    if (!verifyCode || verifyCode.length < 6) { toast.error('Please enter the 6-digit code'); return }
    setIs2FAVerifying(true)
    try {
      const { ok, data } = await postAuth<{ error?: string }>('/api/auth/2fa/verify', { code: verifyCode }, { withCredentials: true })
      if (!ok) { toast.error(data.error || 'Invalid code'); setIs2FAVerifying(false); return }
      toast.success(re.twofa_enabled || '2FA has been enabled!')
      setBankStep(true)
      setTwoFAStep(false)
    } catch {
      toast.error(re.error_2fa_enable || 'Failed to enable 2FA')
      setIs2FAVerifying(false)
    }
  }, [verifyCode, re.error_2fa_enable, re.twofa_enabled])

  const copySecret = useCallback(() => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [secret])

  /* ── Bank connect ────────────────────────────────────────────────── */
  const handleBankConnect = useCallback(async () => {
    setIsConnectingBank(true)
    setConnectError('')

    try {
      const returnTo = `${window.location.origin}/Accounts/callback?redirect=%2F`
      const { ok, data } = await postAuth<{ error?: string; connectUrl?: string }>('/api/bank/connect', {
        returnTo,
        action: 'connect',
      })

      if (!ok || !data.connectUrl) {
        throw new Error(data.error || (re.error_connect_session || 'Failed to create connect session'))
      }

      window.location.assign(data.connectUrl)
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : (re.error_connection_failed || 'Connection failed'))
      setIsConnectingBank(false)
    }
  }, [re.error_connect_session, re.error_connection_failed])

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
      {twoFAStep ? (
        /* ── 2FA Setup step ─────────────────────────────────────── */
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-3 mb-2">
            <div className="flex items-center justify-center w-14 h-14 sq-full bg-blue-500/10 mb-1">
              <ShieldCheck className="w-7 h-7 text-blue-500 dark:text-blue-400" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-black dark:text-white">Set up Two-Factor Authentication</h1>
            <p className="text-[15px] text-neutral-400">Scan the QR code with your authenticator app</p>
          </div>

          {setupState === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}

          {setupState === 'scanning' && qrDataUrl && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className={cn(UDS.largeTileSurface, "p-3")}>
                  <div className="sq-xl p-1" style={{ backgroundColor: "#fff" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- QR is a generated data URL; next/image adds no value here */}
                    <img src={qrDataUrl} alt="2FA QR Code" className="h-[180px] w-[180px]" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[12px] font-medium text-neutral-400 text-center">Or enter this code manually:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className={`${UDS.inlineSurface} select-all px-3 py-2 text-[13px] font-mono tracking-wider text-neutral-900 dark:text-white`}>
                    {secret}
                  </code>
                  <Button type="button" variant="glass" size="icon" onClick={copySecret}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[13px] font-medium text-neutral-400 text-center">Enter the 6-digit code from your app:</p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode} autoFocus>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="glass"
                    size="lg"
                    className="flex-1"
                    onClick={() => { setTwoFAStep(false); setBankStep(true) }}
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    variant="solid"
                    size="lg"
                    className="auth-primary-button flex-1"
                    onClick={handleVerify2FA}
                    disabled={is2FAVerifying || verifyCode.length < 6}
                  >
                    {is2FAVerifying
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying...</>
                      : <><ShieldCheck className="w-4 h-4 mr-2" />Enable 2FA</>}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {setupState === 'idle' && (
            <div className="space-y-3">
              <p className="text-sm text-center text-neutral-400">Something went wrong setting up 2FA.</p>
              <div className="flex gap-2">
                <Button type="button" variant="glass" size="lg" className="flex-1" onClick={() => { setTwoFAStep(false); setBankStep(true) }}>
                  Skip
                </Button>
                <Button type="button" variant="solid" size="lg" className="auth-primary-button flex-1" onClick={start2FASetup}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : bankStep ? (
        /* ── Step 4 — Bank connection ──────────────────────────────── */
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col items-center text-center gap-3 mb-2">
            <div className="flex items-center justify-center w-14 h-14 sq-full bg-emerald-500/10 mb-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-black dark:text-white">Account created!</h1>
            <p className="text-[15px] text-neutral-400">
              Connect your bank to automatically import accounts &amp; transactions into your personal finance dashboard.
            </p>
          </div>

          <div className={`${UDS.surface} p-4`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex items-center justify-center w-8 h-8 shrink-0 sq-full bg-blue-500/10">
                <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-black dark:text-white">How it works</p>
                <ol className="mt-1.5 list-inside list-decimal space-y-1 text-neutral-400">
                  <li>You&apos;ll be redirected to Salt Edge Connect</li>
                  <li>Choose your bank and log in securely</li>
                  <li>Authorize Argent to read your data</li>
                  <li>Accounts &amp; transactions are imported automatically</li>
                </ol>
              </div>
            </div>
          </div>

          <div className={`${UDS.surface} border-dashed p-3 text-center text-xs text-neutral-400`}>
            <p>Your banking credentials are handled directly by your bank.</p>
            <p className="mt-1">Argent never sees or stores your login details.</p>
          </div>

          <ErrorAlert message={connectError} />

          <div className="space-y-4 pt-2">
            <Button type="button" variant="solid" size="lg" className="auth-primary-button w-full gap-2" disabled={isConnectingBank} onClick={handleBankConnect}>
              {isConnectingBank ? <><Loader2 className="w-5 h-5 animate-spin" />Connecting...</> : <><Building2 className="w-5 h-5" />Connect Your Bank</>}
            </Button>
            <Button asChild variant="glass" size="lg" className="w-full">
              <Link href="/">
                Skip for now — I&apos;ll add accounts later
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* ── Form steps 1–4 ────────────────────────────────────────── */
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

                  <p className="text-[13px] text-center text-neutral-400 pt-2">
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
                  <Accordion
                    type="multiple"
                    value={[
                      ...(enableRecoveryEmail ? ['recovery'] : []),
                      ...(enable2FA ? ['2fa'] : []),
                    ]}
                  >
                    {/* Recovery Email toggle */}
                    <AccordionItem value="recovery">
                      <AccordionTrigger asChild>
                        <div className={`${UDS.surface} p-4 transition-colors duration-200 ${enableRecoveryEmail ? 'ring-1 ring-emerald-500/20' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex items-center justify-center w-9 h-9 sq-full transition-colors duration-200",
                                enableRecoveryEmail ? "bg-emerald-500/15" : "bg-emerald-500/10"
                              )}>
                                <Shield className={cn(
                                  "w-4.5 h-4.5 transition-colors duration-200",
                                  enableRecoveryEmail ? "text-emerald-500" : "text-emerald-500/60 dark:text-emerald-400/60"
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-black dark:text-white">Recovery Email</p>
                                <p className="text-xs text-neutral-400">Recover your account if you lose access</p>
                              </div>
                            </div>
                            <Switch
                              checked={enableRecoveryEmail}
                              onCheckedChange={setEnableRecoveryEmail}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-1">
                          <Input
                            id="recoveryEmail"
                            type="email"
                            label="Recovery Email"
                            value={recoveryEmail}
                            onChange={e => setRecoveryEmail(e.target.value)}
                            disabled={loading}
                            autoFocus={enableRecoveryEmail}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* 2FA toggle */}
                    <AccordionItem value="2fa" className="mt-4">
                      <AccordionTrigger asChild>
                        <div className={`${UDS.surface} p-4 transition-colors duration-200 ${enable2FA ? 'ring-1 ring-blue-500/20' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex items-center justify-center w-9 h-9 sq-full transition-colors duration-200",
                                enable2FA ? "bg-blue-500/15" : "bg-blue-500/10"
                              )}>
                                <Smartphone className={cn(
                                  "w-4.5 h-4.5 transition-colors duration-200",
                                  enable2FA ? "text-blue-500" : "text-blue-500/60 dark:text-blue-400/60"
                                )} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-black dark:text-white">Two-Factor Authentication</p>
                                <p className="text-xs text-neutral-400">Extra security with an authenticator app</p>
                              </div>
                            </div>
                            <Switch
                              checked={enable2FA}
                              onCheckedChange={setEnable2FA}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-1">
                          <div className={`${UDS.surface} border-dashed p-3 text-xs text-neutral-400`}>
                            <p>After creating your account, you&apos;ll scan a QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter a 6-digit code to confirm.</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Button type="submit" variant="solid" size="lg" className="auth-primary-button w-full" disabled={loading}>
                    {loading
                      ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating account...</>
                      : <>Create account<ArrowRight className="w-4 h-4" /></>}
                  </Button>
                  <BackButton onClick={goBack} label="Back" />
                </div>
              </div>
            )}

            {/* ── Progress dots ────────────────────────────────────── */}
            <StepIndicator current={stepIndex} total={TOTAL_STEPS} />
          </form>
        </>
      )}
    </AuthShell>
  )
}
