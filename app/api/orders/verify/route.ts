import { NextResponse } from 'next/server'
import { verifyOrder } from '@/lib/verifyOrder'

/**
 * POST /api/orders/verify: check an order against Mesh's own transfer record.
 * The browser only names the order; the server decides whether it is paid.
 */
export async function POST(request: Request) {
  const { transactionId } = await request.json()
  if (!transactionId) {
    return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
  }
  try {
    // Keep asking Mesh for up to two minutes while the transfer is pending.
    const order = await verifyOrder(transactionId, { waitMs: 120_000 })
    if (!order) return NextResponse.json({ error: 'Unknown order' }, { status: 404 })
    console.log(
      `[orders] ${transactionId} → ${order.status}` +
        (order.verifiedAt ? ' (verified with Mesh)' : ` (${order.error ?? 'not verified'})`),
    )
    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
