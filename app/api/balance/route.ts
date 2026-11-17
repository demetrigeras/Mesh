import { NextResponse } from 'next/server'
import { getPaymentBalance } from '@/lib/mesh/api'
import { getConnection } from '@/lib/session'

/**
 * GET /api/balance: the connected account's USDC balance, for the checkout.
 * Uses the access token stored when the buyer connected Coinbase.
 */
export async function GET() {
  const connection = getConnection()
  if (!connection) return NextResponse.json({ connected: false })

  try {
    return NextResponse.json(await getPaymentBalance(connection))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
