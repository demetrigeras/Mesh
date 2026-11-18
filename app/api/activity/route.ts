import { NextResponse } from 'next/server'
import { addActivity, clearActivity, listActivity } from '@/lib/activity'

/** GET /api/activity: every logged call and callback, oldest first. */
export async function GET() {
  return NextResponse.json(listActivity())
}

/**
 * POST /api/activity: the browser reports something only it can see: a call
 * it made to this app, or a Mesh Link callback. Tokens are masked in the
 * browser before they are sent here.
 */
export async function POST(request: Request) {
  const entry = await request.json()
  if (entry.kind !== 'frontend' && entry.kind !== 'callback') {
    return NextResponse.json({ error: 'kind must be "frontend" or "callback"' }, { status: 400 })
  }
  addActivity({
    kind: entry.kind,
    time: Number(entry.time) || Date.now(),
    title: String(entry.title),
    request: entry.request,
    response: entry.response,
    status: entry.status,
    ms: entry.ms,
  })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/activity: clear the log. */
export async function DELETE() {
  clearActivity()
  return NextResponse.json({ ok: true })
}
