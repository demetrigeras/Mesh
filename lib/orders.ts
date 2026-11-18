import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import type { PaymentOrder } from './mesh/types'

// Demo-only order history, kept in a local JSON file so it survives restarts.
// A real store would use a database.

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'failed'

export interface OrderRecord extends PaymentOrder {
  status: OrderStatus
  createdAt: string
  updatedAt: string
  error?: string
  // Set only by verifyOrder, from Mesh's own record of the transfer.
  verifiedAt?: string
  transfer?: {
    transferId: string
    meshStatus: string
    amount: number
    symbol?: string
    amountInFiat: number
    feesInFiat?: number
    toAddress?: string
    txHash?: string
    infoUrl?: string
  }
}

const FILE = path.join(process.cwd(), '.data', 'orders.json')

/** All orders, newest first. */
export function listOrders(): OrderRecord[] {
  if (!fs.existsSync(FILE)) return []
  return JSON.parse(fs.readFileSync(FILE, 'utf8'))
}

export function getOrder(transactionId: string): OrderRecord | undefined {
  return listOrders().find((o) => o.transactionId === transactionId)
}

/** Record a new order as "pending" when its payment link token is created. */
export function recordOrder(order: PaymentOrder): void {
  const now = new Date().toISOString()
  save([{ ...order, status: 'pending', createdAt: now, updatedAt: now }, ...listOrders()])
}

/** Change an order. Returns the updated order, or undefined if the ID is unknown. */
export function updateOrder(
  transactionId: string,
  changes: Partial<Pick<OrderRecord, 'status' | 'error' | 'transfer' | 'verifiedAt'>>,
): OrderRecord | undefined {
  const orders = listOrders()
  const order = orders.find((o) => o.transactionId === transactionId)
  if (!order) return undefined
  Object.assign(order, changes, { updatedAt: new Date().toISOString() })
  save(orders)
  return order
}

/**
 * When `npm run reset` was last run, or undefined if never. The Store
 * dashboard uses it to leave out payments from before the reset.
 */
export function getResetTime(): Date | undefined {
  const file = path.join(path.dirname(FILE), 'reset.json')
  if (!fs.existsSync(file)) return undefined
  return new Date(JSON.parse(fs.readFileSync(file, 'utf8')).resetAt)
}

function save(orders: OrderRecord[]): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(orders, null, 2))
}
