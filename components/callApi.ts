/**
 * Calls one of this app's own API routes and logs the request and response
 * to the browser console, so each call is visible during the demo.
 * Throws if the route returns an error.
 */
export async function callApi<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  console.log(`[app] → ${method} ${path}`, body ? maskToken(body) : '(empty body)')

  const response = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json()

  console.log(`[app] ← ${response.status} ${method} ${path}`, data)

  if (!response.ok) throw new Error(data.error ?? `${method} ${path} failed`)
  return data as T
}

/** Keep the account's access token out of the console. */
function maskToken(body: Record<string, unknown>) {
  return 'accessToken' in body ? { ...body, accessToken: '[hidden]' } : body
}
