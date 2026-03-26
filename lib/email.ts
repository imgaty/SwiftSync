import { Resend } from 'resend';

// =============================================================================
// RESEND CONFIGURATION
// =============================================================================
// Sign up at https://resend.com and set RESEND_API_KEY in your .env
// Free tier: 3,000 emails/month, sends from onboarding@resend.dev
// When you have a custom domain, set RESEND_FROM_EMAIL in .env
// =============================================================================

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SwiftSync <onboarding@resend.dev>';

// =============================================================================
// SEND PASSWORD RESET EMAIL
// =============================================================================

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Reset Your Password — SwiftSync',
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
                      <span style="font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.03em;">SwiftSync</span>
                    </td>
                  </tr>
                  <!-- Card -->
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden;">
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
                                      <td style="border-radius: 10px; background-color: #18181b;" align="center">
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
                        &copy; ${new Date().getFullYear()} SwiftSync
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
  });
}

// =============================================================================
// SEND 2FA CODE EMAIL
// =============================================================================

export async function send2FACode(to: string, code: string) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your Verification Code — SwiftSync',
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
                      <span style="font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.03em;">SwiftSync</span>
                    </td>
                  </tr>
                  <!-- Card -->
                  <tr>
                    <td>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden;">
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
                                  <div style="display: inline-block; padding: 16px 40px; background-color: #f4f4f5; border-radius: 10px; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #18181b;">
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
                        &copy; ${new Date().getFullYear()} SwiftSync
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
  });
}
