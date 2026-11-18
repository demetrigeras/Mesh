import 'server-only' // build fails if this file is ever imported into browser code

import { addActivity } from '../activity'
import { mockMeshResponse } from './mock'
import type { MeshEnvelope } from './types'

const BASE_URL =
  process.env.MESH_BASE_URL ?? 'https://sandbox-integration-api.meshconnect.com'

/** Mock mode is on when MESH_MOCK=true or when either credential is missing. */
export function isMockMode(): boolean {
  return (
    process.env.MESH_MOCK === 'true' ||
    !process.env.MESH_CLIENT_ID ||
    !process.env.MESH_CLIENT_SECRET
  )
}

export class MeshError extends Error {}

/**
 * The single door to the Mesh API. Every call goes through here, so this is
 * the only place that touches credentials, logging and the mock switch.
 * Returns the `content` of the Mesh response envelope.
 */
export async function meshFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  { quiet = false } = {}, // quiet = one summary line, for calls repeated while polling
): Promise<T> {
  const mock = isMockMode()
  const tag = mock ? '[mesh:mock]' : '[mesh]'
  const startedAt = Date.now()

  if (!quiet) console.log(`${tag} → ${method} ${path}`, body ? pretty(redact(body)) : '')

  let httpStatus = 200
  let envelope: MeshEnvelope<T>

  if (mock) {
    envelope = mockMeshResponse(method, path) as MeshEnvelope<T>
  } else {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': process.env.MESH_CLIENT_ID!,
        'X-Client-Secret': process.env.MESH_CLIENT_SECRET!, // never logged
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    httpStatus = response.status
    const text = await response.text()
    try {
      envelope = JSON.parse(text)
    } catch {
      // e.g. a 401 comes back with an empty body
      envelope = { content: null as T, status: 'error', message: text || response.statusText }
    }
  }

  const elapsed = Date.now() - startedAt
  console.log(
    `${tag} ← ${httpStatus} ${method} ${path} (${elapsed}ms)`,
    quiet ? '(polling, payload not shown)' : pretty(redact(envelope)),
  )

  // The same information, for the Activity page.
  addActivity(
    {
      kind: 'mesh',
      time: startedAt,
      title: `${method} ${path}`,
      request: body ? redact(body) : undefined,
      response: quiet ? undefined : redact(envelope),
      status: httpStatus,
      ms: elapsed,
    },
    { polling: quiet },
  )

  if (httpStatus >= 400 || envelope.status !== 'ok') {
    const reason = envelope.displayMessage || envelope.message || `HTTP ${httpStatus}`
    throw new MeshError(`Mesh ${method} ${path} failed: ${reason}`)
  }
  return envelope.content
}

// ---- Logging helpers ----

const SECRET_KEYS = new Set(['authToken', 'accessToken', 'refreshToken', 'linkToken'])

const MAX_LOGGED_ITEMS = 3 // the networks list alone is thousands of lines

/** Copy a value for logging: mask tokens and shorten long lists. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_LOGGED_ITEMS).map(redact)
    const hidden = value.length - shown.length
    return hidden > 0 ? [...shown, `…and ${hidden} more`] : shown
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) =>
        SECRET_KEYS.has(key) && typeof inner === 'string'
          ? [key, inner.slice(0, 6) + '…[redacted]']
          : [key, redact(inner)],
      ),
    )
  }
  return value
}

function pretty(value: unknown): string {
  return '\n' + JSON.stringify(value, null, 2)
}
