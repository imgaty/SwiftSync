#!/usr/bin/env node

/**
 * Login test helper for SwiftSync auth endpoints.
 *
 * Usage:
 *   node scripts/login-test.js --email you@example.com --password yourpass
 *   node scripts/login-test.js --email you@example.com --password yourpass --base-url http://localhost:3000
 *   node scripts/login-test.js --email you@example.com --password yourpass --code 123456
 *
 * Env fallback:
 *   LOGIN_EMAIL, LOGIN_PASSWORD, LOGIN_2FA_CODE, BASE_URL
 */

const args = process.argv.slice(2)

function getArg(name) {
  const index = args.findIndex((item) => item === `--${name}`)
  if (index === -1) return undefined
  return args[index + 1]
}

const baseUrl = getArg('base-url') || process.env.BASE_URL || 'http://localhost:3000'
const email = getArg('email') || process.env.LOGIN_EMAIL
const password = getArg('password') || process.env.LOGIN_PASSWORD
const twoFactorCode = getArg('code') || process.env.LOGIN_2FA_CODE

if (!email || !password) {
  console.error('Missing credentials.')
  console.error('Use: node scripts/login-test.js --email you@example.com --password yourpass [--code 123456]')
  process.exit(1)
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return ''
  const raw = Array.isArray(setCookieHeader)
    ? setCookieHeader[0]
    : setCookieHeader.split(',').map((part) => part.trim())[0]
  return raw.split(';')[0]
}

async function postJson(path, body, cookie = '') {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  const setCookie = response.headers.get('set-cookie') || ''

  return { ok: response.ok, status: response.status, data, cookie: extractCookie(setCookie) }
}

async function getJson(path, cookie = '') {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
    },
  })

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  return { ok: response.ok, status: response.status, data }
}

async function main() {
  console.log(`Testing login against ${baseUrl}`)
  console.log(`Email: ${email}`)

  const login = await postJson('/api/auth/login', { email, password })
  console.log('\n[1] /api/auth/login')
  console.log(`Status: ${login.status}`)
  console.log('Response:', login.data)

  if (!login.ok) {
    process.exit(1)
  }

  let sessionCookie = login.cookie

  if (login.data?.needs_2fa) {
    if (!twoFactorCode) {
      console.error('\n2FA is required. Run again with --code 123456 or LOGIN_2FA_CODE env var.')
      process.exit(1)
    }

    const twoFa = await postJson('/api/auth/2fa-login', {
      tempToken: login.data.tempToken,
      code: twoFactorCode,
      trustDevice: true,
    })

    console.log('\n[2] /api/auth/2fa-login')
    console.log(`Status: ${twoFa.status}`)
    console.log('Response:', twoFa.data)

    if (!twoFa.ok) {
      process.exit(1)
    }

    sessionCookie = twoFa.cookie || sessionCookie
  }

  if (!sessionCookie) {
    console.warn('\nNo auth cookie captured from response. Verify endpoint may fail in script context.')
  }

  const verify = await getJson('/api/auth/verify', sessionCookie)
  console.log('\n[3] /api/auth/verify')
  console.log(`Status: ${verify.status}`)
  console.log('Response:', verify.data)

  if (!verify.ok) {
    process.exit(1)
  }

  console.log('\nLogin test completed successfully.')
}

main().catch((error) => {
  console.error('Login test failed:', error)
  process.exit(1)
})
