import { maskTokens, reportActivity } from './activity'

/**
 * Calls one of this app's own API routes and logs the request and response
 * to the browser console and the Activity page, so each call is visible
 * during the demo. Throws if the route returns an error.
 */
export async function callApi<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const startedAt = Date.now()
  console.log(`[app] → ${method} ${path}`, body ? maskTokens(body) : '(empty body)')

  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json()

  console.log(`[app] ← ${response.status} ${method} ${path}`, maskTokens(data))
  reportActivity({
    kind: 'frontend',
    time: startedAt,
    title: `${method} ${path}`,
    request: maskTokens(body),
    response: maskTokens(data),
    status: response.status,
    ms: Date.now() - startedAt,
  })

  if (!response.ok) throw new Error(data.error ?? `${method} ${path} failed`)
  return data as T
}
