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
const EMAIL_SQUIRCLE_CARD =
  '-webkit-clip-path: polygon(4% 0, 96% 0, 98% 0.5%, 99.3% 2%, 99.8% 4%, 100% 8%, 100% 92%, 99.8% 96%, 99.3% 98%, 98% 99.5%, 96% 100%, 4% 100%, 2% 99.5%, 0.7% 98%, 0.2% 96%, 0 92%, 0 8%, 0.2% 4%, 0.7% 2%, 2% 0.5%); clip-path: polygon(4% 0, 96% 0, 98% 0.5%, 99.3% 2%, 99.8% 4%, 100% 8%, 100% 92%, 99.8% 96%, 99.3% 98%, 98% 99.5%, 96% 100%, 4% 100%, 2% 99.5%, 0.7% 98%, 0.2% 96%, 0 92%, 0 8%, 0.2% 4%, 0.7% 2%, 2% 0.5%);';
const EMAIL_SQUIRCLE_CONTROL =
  '-webkit-clip-path: polygon(8% 0, 92% 0, 96% 0.8%, 98% 2%, 99.2% 4%, 100% 8%, 100% 92%, 99.2% 96%, 98% 98%, 96% 99.2%, 92% 100%, 8% 100%, 4% 99.2%, 2% 98%, 0.8% 96%, 0 92%, 0 8%, 0.8% 4%, 2% 2%, 4% 0.8%); clip-path: polygon(8% 0, 92% 0, 96% 0.8%, 98% 2%, 99.2% 4%, 100% 8%, 100% 92%, 99.2% 96%, 98% 98%, 96% 99.2%, 92% 100%, 8% 100%, 4% 99.2%, 2% 98%, 0.8% 96%, 0 92%, 0 8%, 0.8% 4%, 2% 2%, 4% 0.8%);';

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
                      <span style="font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.03em;">Argent</span>
                    </td>
                  </tr>
                  <!-- Card -->
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e4e4e7; ${EMAIL_SQUIRCLE_CARD} overflow: hidden;">
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px 36px 36px;">
                            <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.02em; text-align: center;">
                              Reset your password
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 14px; color: #71717a; line-height: 1.65; text-align: center;">
                              We received a request to reset your password.<br/>Click the button below to choose a new one. This link expires in <strong style="color: #3f3f46;">1 hour</strong>.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;" width="100%">
                              <tr>
                                <td align="center">
                                  <table cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td style="${EMAIL_SQUIRCLE_CONTROL} background-color: #18181b;" align="center">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 12px 36px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: -0.01em;">
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

                            <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.6; text-align: center;">
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
                      <p style="margin: 0; font-size: 11px; color: #a1a1aa; letter-spacing: 0.01em;">
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
// SEND 2FA CODE EMAIL
// =============================================================================

export async function send2FACode(to: string, code: string) {
  await sendEmailOrThrow({
    from: FROM_EMAIL,
    to,
    subject: 'Your Verification Code — Argent',
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
                      <span style="font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.03em;">Argent</span>
                    </td>
                  </tr>
                  <!-- Card -->
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e4e4e7; ${EMAIL_SQUIRCLE_CARD} overflow: hidden;">
                        <!-- Content -->
                        <tr>
                          <td style="padding: 40px 36px 36px;">
                            <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.02em; text-align: center;">
                              Verification Code
                            </h1>
                            <p style="margin: 0 0 28px; font-size: 14px; color: #71717a; line-height: 1.65; text-align: center;">
                              Enter the code below to verify your identity.<br/>This code expires in <strong style="color: #3f3f46;">10 minutes</strong>.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;" width="100%">
                              <tr>
                                <td align="center">
                                  <div style="display: inline-block; padding: 16px 40px; background-color: #f4f4f5; ${EMAIL_SQUIRCLE_CONTROL} font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #18181b;">
                                    ${code}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <!-- Divider -->
                            <div style="margin: 0 0 20px; height: 1px; background-color: #f4f4f5;"></div>

                            <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.6; text-align: center;">
                              If you didn&rsquo;t request this code, you can safely ignore this email.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 28px;">
                      <p style="margin: 0; font-size: 11px; color: #a1a1aa; letter-spacing: 0.01em;">
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
  }, '2FA email');
}
