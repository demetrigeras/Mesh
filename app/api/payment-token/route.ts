import { NextResponse } from 'next/server'
import { createPaymentSession } from '@/lib/mesh/api'
import { recordOrder } from '@/lib/orders'

/**
 * POST /api/payment-token: link token for the $50 shoes payment.
 * The price, token, network and destination are all decided on the server,
 * so the browser cannot change what is being paid for.
 */
export async function POST() {
  try {
    const session = await createPaymentSession()
    if (session.order) recordOrder(session.order) // starts as "pending"
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
