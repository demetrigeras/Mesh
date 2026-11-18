import { NextResponse } from 'next/server'
import { createPaymentSession } from '@/lib/mesh/api'
import { recordOrder } from '@/lib/orders'
import { getConnection } from '@/lib/session'

/**
 * POST /api/payment-token: link token for the $50 shoes payment.
 * The price, token, network and destination are all decided on the server,
 * so the browser cannot change what is being paid for.
 */
export async function POST() {
  try {
    const session = await createPaymentSession()
    if (session.order) recordOrder(session.order) // starts as "pending"

    // Returning buyer: send their saved account along, so Link opens on the
    // payment instead of the Coinbase login. The SDK needs the access token in
    // the browser to do this. It is useless without our client secret, but a
    // real app would only return it to the signed-in user it belongs to.
    // VERIFY: what Link shows if the saved token has expired. Expected: it
    // falls back to the normal login.
    const connection = getConnection()
    return NextResponse.json({
      ...session,
      accessTokens: connection?.accountId ? [connection] : undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
