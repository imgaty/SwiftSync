//
//  email.ts
//  Argent
//
//  Created by Hilario Ferreira on 21 March 2026 at 17:05.
//  Description: Provides shared email logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { Resend } from 'resend';

// =============================================================================
// RESEND CONFIGURATION
// =============================================================================
// Sign up at https://resend.com and set RESEND_API_KEY in your .env
// Free tier: 3,000 emails/month, sends from onboarding@resend.dev
// When you have a custom domain, set RESEND_FROM_EMAIL in .env
// =============================================================================

let _resend: Resend | null = null;
let _loggedDevRecipientOverride = false;

function getResend() {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      throw new Error('Email service is not configured. Missing `RESEND_API_KEY`.');
    }

    _resend = new Resend(apiKey);
  }

  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Argent <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
const DEV_TO_EMAIL = process.env.RESEND_DEV_TO_EMAIL?.trim() || '';
const EMAIL_CARD_RADIUS = 'border-radius: 22px;';
const EMAIL_CONTROL_RADIUS = 'border-radius: 8px;';
const EMAIL_TEXT_SIZE = {
  xs: '12px',
  sm: '14px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
} as const;

function emailTextSize(size: keyof typeof EMAIL_TEXT_SIZE) {
  return `font-size: ${EMAIL_TEXT_SIZE[size]};`;
}

function resolveRecipient(to: string) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction && DEV_TO_EMAIL) {
    if (!_loggedDevRecipientOverride) {
      console.warn(
        `Email dev override active: redirecting outgoing email recipients to ${DEV_TO_EMAIL}`,
      );
      _loggedDevRecipientOverride = true;
    }

    return DEV_TO_EMAIL;
  }

  return to;
}

async function sendEmailOrThrow(
  payload: { from: string; to: string; subject: string; html: string },
  label: string,
) {
  const to = resolveRecipient(payload.to);
  const result = await getResend().emails.send({ ...payload, to });

  if (result.error) {
    throw new Error(`Failed to send ${label} to ${to}: ${result.error.message}`);
  }

  return result.data;
}

// =============================================================================
// SEND PASSWORD RESET EMAIL
// =============================================================================

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  await sendEmailOrThrow({
    from: FROM_EMAIL,
    to,
    subject: 'Reset Your Password — Argent',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light only" />
          <meta name="supported-color-schemes" content="light only" />
          <style>
            :root { color-scheme: light only; }
            @media (prefers-color-scheme: dark) {
              body, table, td, div, p, h1, span { background-color: #f4f4f5 !important; }
              .card-bg { background-color: #ffffff !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 48px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 460px;">
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <span style="${emailTextSize('xl')} font-weight: 700; color: #18181b; letter-spacing: -0.03em;">Argent</span>
                    </td>
                  </tr>
                  <!-- Card -->
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e4e4e7; ${EMAIL_CARD_RADIUS} overflow: hidden;">
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px 36px 36px;">
                            <h1 style="margin: 0 0 8px; ${emailTextSize('2xl')} font-weight: 700; color: #18181b; letter-spacing: -0.02em; text-align: center;">
                              Reset your password
                            </h1>
                            <p style="margin: 0 0 28px; ${emailTextSize('sm')} color: #71717a; line-height: 1.65; text-align: center;">
                              We received a request to reset your password.<br/>Click the button below to choose a new one. This link expires in <strong style="color: #3f3f46;">1 hour</strong>.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;" width="100%">
                              <tr>
                                <td align="center">
                                  <table cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td style="${EMAIL_CONTROL_RADIUS} background-color: #18181b;" align="center">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 36px; color: #ffffff; text-decoration: none; ${EMAIL_CONTROL_RADIUS} ${emailTextSize('sm')} font-weight: 600; letter-spacing: -0.01em;">
                                          Reset Password
                                        </a>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            <!-- Divider -->
                            <div style="margin: 0 0 20px; height: 1px; background-color: #f4f4f5;"></div>

                            <p style="margin: 0; ${emailTextSize('xs')} color: #a1a1aa; line-height: 1.6; text-align: center;">
                              If you didn&rsquo;t request this, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 28px;">
                      <p style="margin: 0; ${emailTextSize('xs')} color: #a1a1aa; letter-spacing: 0.01em;">
                        &copy; ${new Date().getFullYear()} Argent
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }, 'password reset email');
}

// =============================================================================
// SEND EMAIL TWO-FACTOR CODE
// =============================================================================

export async function sendEmailTwoFactorCode(to: string, code: string) {
  await sendEmailOrThrow({
    from: FROM_EMAIL,
    to,
    subject: 'Your Login Code — Argent',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light only" />
          <meta name="supported-color-schemes" content="light only" />
          <style>
            :root { color-scheme: light only; }
            @media (prefers-color-scheme: dark) {
              body, table, td, div, p, h1, span { background-color: #f4f4f5 !important; }
              .card-bg { background-color: #ffffff !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 48px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 460px;">
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <span style="${emailTextSize('xl')} font-weight: 700; color: #18181b;">Argent</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e4e4e7; ${EMAIL_CARD_RADIUS} overflow: hidden;">
                        <tr>
                          <td style="padding: 40px 36px 36px;">
                            <h1 style="margin: 0 0 8px; ${emailTextSize('2xl')} font-weight: 700; color: #18181b; text-align: center;">
                              Login code
                            </h1>
                            <p style="margin: 0 0 28px; ${emailTextSize('sm')} color: #71717a; line-height: 1.65; text-align: center;">
                              Enter this code to finish signing in. It expires in <strong style="color: #3f3f46;">5 minutes</strong>.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;" width="100%">
                              <tr>
                                <td align="center">
                                  <div style="${EMAIL_CONTROL_RADIUS} display: inline-block; padding: 16px 40px; background-color: #f4f4f5; ${emailTextSize('3xl')} font-weight: 700; letter-spacing: 0.3em; color: #18181b;">
                                    ${code}
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <div style="margin: 0 0 20px; height: 1px; background-color: #f4f4f5;"></div>
                            <p style="margin: 0; ${emailTextSize('xs')} color: #a1a1aa; line-height: 1.6; text-align: center;">
                              If you did not try to sign in, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 28px;">
                      <p style="margin: 0; ${emailTextSize('xs')} color: #a1a1aa;">
                        &copy; ${new Date().getFullYear()} Argent
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }, 'email two-factor code');
}
