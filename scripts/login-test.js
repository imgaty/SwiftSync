#!/usr/bin/env node

//
//  login-test.js
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides the login test maintenance script for Argent, automating operational or
//  data-repair work that supports local development and administration.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
/**
 * Login test helper for Argent auth endpoints.
 *
 * Usage:
 *   node scripts/login-test.js --email you@example.com --password yourpass
 *   node scripts/login-test.js --email you@example.com --password yourpass --code 123456
 *   node scripts/login-test.js --email you@example.com --password yourpass --base-url http://localhost:3000
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
const verificationCode = getArg('code') || process.env.LOGIN_2FA_CODE

if (!email || !password) {
  console.error('Missing credentials.')
  console.error('Use: node scripts/login-test.js --email you@example.com --password yourpass')
  process.exit(1)
}

function splitSetCookieHeader(header) {
  if (!header) return []
  return header.split(/,(?=\s*[^;,=\s]+=[^;,]+)/).map((part) => part.trim()).filter(Boolean)
}

function extractCookies(headers) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : splitSetCookieHeader(headers.get('set-cookie') || '')

  return setCookies
    .map((raw) => raw.split(';')[0])
    .filter(Boolean)
}

function mergeCookieJar(current, nextCookies) {
  const jar = new Map()

  for (const cookie of current.split(';').map((part) => part.trim()).filter(Boolean)) {
    const [name] = cookie.split('=')
    if (name) jar.set(name, cookie)
  }

  for (const cookie of nextCookies) {
    const [name] = cookie.split('=')
    if (name) jar.set(name, cookie)
  }

  return Array.from(jar.values()).join('; ')
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

  return { ok: response.ok, status: response.status, data, cookies: extractCookies(response.headers) }
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

  let sessionCookie = mergeCookieJar('', login.cookies)

  if (login.data?.needs_2fa) {
    if (!verificationCode) {
      console.error('\nEmail 2FA is required. Run again with --code 123456 or LOGIN_2FA_CODE.')
      process.exit(1)
    }

    const twoFa = await postJson('/api/auth/2fa-login', {
      tempToken: login.data.tempToken,
      code: verificationCode,
    }, sessionCookie)

    console.log('\n[2] /api/auth/2fa-login')
    console.log(`Status: ${twoFa.status}`)
    console.log('Response:', twoFa.data)

    if (!twoFa.ok) {
      process.exit(1)
    }

    sessionCookie = mergeCookieJar(sessionCookie, twoFa.cookies)
  }

  if (!sessionCookie) {
    console.warn('\nNo auth cookie captured from response. Verify endpoint may fail in script context.')
  }

  const verify = await getJson('/api/auth/verify', sessionCookie)
  console.log(`\n[${login.data?.needs_2fa ? 3 : 2}] /api/auth/verify`)
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
