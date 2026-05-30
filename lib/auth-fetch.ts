//
//  auth-fetch.ts
//  Argent
//
//  Created by hilario on 22 May 2026 at 09:36.
//  Description: Provides shared auth fetch logic for Argent, centralizing domain behavior, helpers, or
//  integration code used by pages, routes, and components.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export interface PostAuthResult<T> {
  ok: boolean
  data: T
}

export async function postAuth<T>(
  url: string,
  body: unknown,
  opts: { withCredentials?: boolean } = {},
): Promise<PostAuthResult<T>> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: JSON_HEADERS,
      ...(opts.withCredentials ? { credentials: 'include' as const } : {}),
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Network error — check your internet connection.')
  }

  let data: T
  try {
    data = (await res.json()) as T
  } catch {
    throw new Error(`Server returned ${res.status} with no JSON body.`)
  }

  return { ok: res.ok, data }
}
