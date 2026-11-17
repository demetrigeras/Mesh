import { NextResponse } from 'next/server'
import { listOrders, updateOrder } from '@/lib/orders'

/** GET /api/orders: every order, newest first. */
export async function GET() {
  return NextResponse.json(listOrders())
}

/**
 * PATCH /api/orders: the browser reports that the buyer left without paying.
 * It can only say "cancelled" or "failed". "Paid" is never accepted from the
 * browser; that is decided by POST /api/orders/verify.
 */
export async function PATCH(request: Request) {
  const { transactionId, status, error } = await request.json()
  if (!transactionId || (status !== 'cancelled' && status !== 'failed')) {
    return NextResponse.json(
      { error: 'transactionId and a status of cancelled or failed are required' },
      { status: 400 },
    )
  }
  if (!updateOrder(transactionId, { status, error })) {
    return NextResponse.json({ error: 'Unknown order' }, { status: 404 })
  }
  console.log(`[orders] ${transactionId} → ${status}`)
  return NextResponse.json({ ok: true })
}
