'use client'

import { useEffect, useState } from 'react'
import type { ActivityEntry } from '@/lib/activity'

// How each kind of entry is labelled and coloured.
const KINDS = {
  frontend: {
    label: 'Frontend → Backend',
    hint: 'The browser calling one of this app’s own routes',
    style: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  mesh: {
    label: 'Backend → Mesh',
    hint: 'This app’s server calling the Mesh API, with X-Client-Id and X-Client-Secret headers',
    style: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  callback: {
    label: 'Mesh Link → Frontend',
    hint: 'A callback: Mesh Link telling the browser what happened in the modal',
    style: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
}

// The modal events worth showing in a walkthrough: the buyer starts the
// transfer, then passes the exchange's MFA check for it. The rest (page
// loads, selections, previews) are hidden unless "Show all modal events" is on.
const KEY_EVENTS = new Set(['onEvent: transferStarted', 'onEvent: transferMfaEntered'])

/**
 * Every call and callback in the order it happened, with its request and
 * response. Reads the server's activity log and refreshes every 2 seconds.
 * Uses plain fetch so that reading the log does not add to the log.
 */
export function ActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [showAllEvents, setShowAllEvents] = useState(false)

  async function load() {
    const response = await fetch('/api/activity', { cache: 'no-store' })
    if (response.ok) setEntries(await response.json())
  }

  async function clear() {
    await fetch('/api/activity', { method: 'DELETE' })
    setEntries([])
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 2000)
    return () => clearInterval(timer)
  }, [])

  // Link reports a couple of dozen small events per payment. By default show
  // only the ones in KEY_EVENTS; the three main callbacks are always shown.
  const shown = showAllEvents
    ? entries
    : entries.filter((e) => !e.title.startsWith('onEvent: ') || KEY_EVENTS.has(e.title))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {Object.values(KINDS).map((kind) => (
          <span key={kind.label} title={kind.hint} className={`rounded-full border px-2.5 py-1 font-medium ${kind.style}`}>
            {kind.label}
          </span>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-slate-600">
          <input type="checkbox" checked={showAllEvents} onChange={(e) => setShowAllEvents(e.target.checked)} />
          Show all modal events
        </label>
        <button onClick={clear} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium hover:bg-slate-50">
          Clear
        </button>
      </div>

      {shown.length === 0 && (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Nothing yet. Make a payment on the Shop page, then come back here.
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {shown.map((entry, index) => {
          const kind = KINDS[entry.kind]
          return (
            <li key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-slate-400">{index + 1}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${kind.style}`}>
                  {kind.label}
                </span>
                <code className="break-all text-sm font-semibold">{entry.title}</code>
                <span className="ml-auto whitespace-nowrap text-xs text-slate-500">
                  {entry.status != null && `${entry.status} · `}
                  {entry.ms != null && `${entry.ms}ms · `}
                  {new Date(entry.time).toLocaleTimeString()}
                </span>
              </div>

              {entry.repeats && (
                <p className="mt-2 text-xs text-slate-500">
                  Polling: called {entry.repeats} time{entry.repeats === 1 ? '' : 's'} while Mesh
                  reported the transfer as pending. Payloads not shown.
                </p>
              )}
              {entry.kind === 'mesh' && (
                <p className="mt-2 text-xs text-slate-500">
                  Headers: X-Client-Id, X-Client-Secret (added on the server, never shown)
                </p>
              )}
              <Payload label={entry.kind === 'callback' ? undefined : 'Request'} value={entry.request} empty={entry.kind !== 'callback' && !entry.repeats ? '(no body)' : undefined} />
              <Payload label={entry.kind === 'callback' ? 'Payload' : 'Response'} value={entry.response} />
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** One collapsible JSON block. */
function Payload({ label, value, empty }: { label?: string; value: unknown; empty?: string }) {
  if (!label) return null
  if (value === undefined || value === null) {
    return empty ? <p className="mt-2 text-xs text-slate-500">{label}: {empty}</p> : null
  }
  return (
    <details open className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-slate-600">{label}</summary>
      <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}
