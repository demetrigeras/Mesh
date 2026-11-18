import { NextResponse } from 'next/server'
import { clearConnection, getConnection, saveConnection } from '@/lib/session'

/** GET /api/connection: is an account connected? The token itself is never returned. */
export async function GET() {
  const connection = getConnection()
  return NextResponse.json(
    connection
      ? { connected: true, brokerName: connection.brokerName, accountName: connection.accountName }
      : { connected: false },
  )
}

/** POST /api/connection: store the token Mesh Link handed to the browser. */
export async function POST(request: Request) {
  const { accessToken, brokerType, brokerName, accountId, accountName } = await request.json()
  if (!accessToken || !brokerType || !accountId) {
    return NextResponse.json(
      { error: 'accessToken, brokerType and accountId are required' },
      { status: 400 },
    )
  }
  saveConnection({
    accessToken,
    brokerType,
    brokerName: brokerName ?? brokerType,
    accountId,
    accountName: accountName ?? 'Account',
  })
  console.log(`[session] stored ${brokerType} connection`)
  return NextResponse.json({ connected: true })
}

/** DELETE /api/connection: forget the connected account. */
export async function DELETE() {
  clearConnection()
  return NextResponse.json({ connected: false })
}
