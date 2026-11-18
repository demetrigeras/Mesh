// Browser-side helpers for the Activity page.

interface BrowserActivity {
  kind: 'frontend' | 'callback'
  time: number
  title: string
  request?: unknown
  response?: unknown
  status?: number
  ms?: number
}

/**
 * Send one entry to the server's activity log. Uses plain fetch (not callApi)
 * so that logging a call does not itself get logged. Never throws: the log is
 * a demo aid and must not break a payment.
 */
export function reportActivity(entry: BrowserActivity): void {
  fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {})
}

/** A copy that is safe to display: tokens hidden, bulky values shortened. */
export function maskTokens<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(
    JSON.stringify(value, (key, inner) => {
      if (key === 'accessToken' || key === 'refreshToken') return '[hidden]'
      if (key === 'brokerLogo') return '[image]'
      if (key === 'linkToken' && typeof inner === 'string') return inner.slice(0, 24) + '…'
      return inner
    }),
  )
}
