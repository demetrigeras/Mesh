import 'server-only'

// Demo-only: a running list of every call and callback, shown on the Activity
// page so the whole flow can be read in one place. Held in server memory.

export interface ActivityEntry {
  id: number
  time: number // when it started, in milliseconds since 1970
  // Who is talking to whom:
  //   frontend = the browser calling one of this app's own routes
  //   mesh     = this app's server calling the Mesh API
  //   callback = Mesh Link telling the browser what happened in the modal
  kind: 'frontend' | 'mesh' | 'callback'
  title: string // e.g. "POST /api/v1/linktoken" or "onTransferFinished"
  request?: unknown
  response?: unknown
  status?: number // HTTP status
  ms?: number // how long the call took
  repeats?: number // set when the same polling call ran several times in a row
}

const MAX_ENTRIES = 300

// Kept on globalThis so it survives Next.js hot reloads in development.
const store = globalThis as typeof globalThis & { __activity?: ActivityEntry[]; __activityId?: number }

/** Add an entry. `polling: true` folds repeats of the same call into one line. */
export function addActivity(
  entry: Omit<ActivityEntry, 'id' | 'repeats'>,
  { polling = false } = {},
): void {
  const entries = (store.__activity ??= [])
  const last = entries[entries.length - 1]
  if (polling && last?.repeats && last.kind === entry.kind && last.title === entry.title) {
    last.repeats += 1
    return
  }
  store.__activityId = (store.__activityId ?? 0) + 1
  entries.push({ ...entry, id: store.__activityId, repeats: polling ? 1 : undefined })
  if (entries.length > MAX_ENTRIES) entries.shift()
}

/** Every entry, in the order things happened. */
export function listActivity(): ActivityEntry[] {
  return [...(store.__activity ?? [])].sort((a, b) => a.time - b.time || a.id - b.id)
}

export function clearActivity(): void {
  store.__activity = []
}
