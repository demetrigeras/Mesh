import 'server-only'

// Demo-only storage: one connected account, held in server memory.
// It is lost on restart and shared by every visitor. A real app would keep
// this encrypted in a database, keyed by the signed-in user.

/**
 * A connected account. These are the five fields the Mesh SDK's `accessTokens`
 * option expects, so a saved connection can be handed straight back to Link
 * to let a returning buyer skip the login.
 */
export interface Connection {
  accessToken: string // Mesh auth token for the connected account
  brokerType: string
  brokerName: string
  accountId: string
  accountName: string
}

// Kept on globalThis so it survives Next.js hot reloads in development.
const store = globalThis as typeof globalThis & { __meshConnection?: Connection }

export function getConnection(): Connection | undefined {
  return store.__meshConnection
}

export function saveConnection(connection: Connection): void {
  store.__meshConnection = connection
}

export function clearConnection(): void {
  delete store.__meshConnection
}
