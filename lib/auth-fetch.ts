// Shared client-side fetch helper for auth POST endpoints. Handles JSON
// encoding, decoding, network errors, and non-JSON server responses uniformly
// so each auth page doesn't ship its own copy.

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
