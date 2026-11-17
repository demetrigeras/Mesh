import 'server-only'

import { findTransfer } from './mesh/api'
import { getOrder, listOrders, updateOrder, type OrderRecord } from './orders'
import type { MeshTransfer, PaymentOrder } from './mesh/types'

const POLL_EVERY_MS = 3_000

/**
 * Server-side payment verification. An order only becomes "paid" here, after
 * our server has asked Mesh directly and the transfer matches what we sold.
 * The browser's onTransferFinished callback is just the trigger to check.
 *
 * Mesh keeps a new transfer "pending" for a while after the buyer confirms,
 * so with `waitMs` the server keeps asking until Mesh reports a final status
 * or the time runs out.
 *
 * Returns the updated order, or undefined if the order ID is unknown.
 */
export async function verifyOrder(
  transactionId: string,
  { waitMs = 0 } = {},
): Promise<OrderRecord | undefined> {
  const order = getOrder(transactionId)
  if (!order) return undefined

  const deadline = Date.now() + waitMs
  for (let attempt = 1; ; attempt++) {
    // Log the first lookup in full; later ones as a single line.
    const transfer = await findTransfer(transactionId, { quiet: attempt > 1 })
    const settled = transfer && transfer.status !== 'pending'
    if (settled || Date.now() >= deadline) return saveResult(order, transfer)
    await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS))
  }
}

/**
 * Re-check orders Mesh was still processing last time we looked. Called when
 * the Orders page loads, so nothing stays "pending" once Mesh has settled it.
 */
export async function verifyPendingOrders(): Promise<void> {
  const inFlight = listOrders().filter((o) => o.status === 'pending' && o.transfer)
  await Promise.all(inFlight.map((o) => verifyOrder(o.transactionId).catch(() => undefined)))
}

/** Turn Mesh's answer into the order's new status. */
function saveResult(order: OrderRecord, transfer: MeshTransfer | undefined) {
  const { transactionId } = order

  if (!transfer) {
    // Mesh has no record: the buyer never confirmed, or it is too early.
    return updateOrder(transactionId, { error: 'Mesh has no transfer for this order yet' })
  }

  const details = {
    transferId: transfer.id,
    meshStatus: transfer.status,
    amount: transfer.amount,
    symbol: transfer.symbol,
    amountInFiat: transfer.amountInFiat,
    feesInFiat: transfer.totalFeesAmountInFiat,
    toAddress: transfer.destinationAddress,
    txHash: transfer.hash,
    infoUrl: transfer.infoUrl,
  }

  if (transfer.status === 'pending') {
    return updateOrder(transactionId, { status: 'pending', transfer: details, error: undefined })
  }
  if (transfer.status !== 'succeeded') {
    return updateOrder(transactionId, {
      status: 'failed',
      transfer: details,
      error: `Mesh reports the transfer as ${transfer.status}`,
    })
  }

  const problem = mismatch(order, transfer)
  if (problem) {
    return updateOrder(transactionId, { status: 'failed', transfer: details, error: problem })
  }

  return updateOrder(transactionId, {
    status: 'paid',
    transfer: details,
    verifiedAt: new Date().toISOString(),
    error: undefined,
  })
}

/** Did the buyer pay what we asked, in the right token, to the right place? */
function mismatch(order: PaymentOrder, transfer: MeshTransfer): string | undefined {
  if (transfer.symbol !== order.symbol) {
    return `Paid in ${transfer.symbol}, expected ${order.symbol}`
  }
  if (transfer.networkId !== order.networkId) {
    return `Paid on ${transfer.networkName}, expected ${order.networkName}`
  }
  if (transfer.destinationAddress?.toLowerCase() !== order.toAddress.toLowerCase()) {
    return 'Paid to a different address than the order specified'
  }
  if (transfer.amountInFiat < order.amountInFiat) {
    return `Paid $${transfer.amountInFiat}, expected $${order.amountInFiat}`
  }
  return undefined
}
