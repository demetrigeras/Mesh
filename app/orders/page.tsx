import { listOrders, type OrderStatus } from '@/lib/orders'
import { verifyPendingOrders } from '@/lib/verifyOrder'

const STATUS_STYLE: Record<OrderStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
}

/** Every payment attempt made from the shop, newest first. */
export default async function OrdersPage() {
  await verifyPendingOrders() // settle anything Mesh was still processing
  const orders = listOrders()

  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-slate-600">
        Every payment attempt. An order starts as pending and only becomes paid
        once this server has confirmed the transfer with Mesh.
      </p>

      {orders.length === 0 && (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No orders yet. Buy something in the shop.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order.transactionId} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {order.description} · ${order.amountInFiat.toFixed(2)} in {order.symbol} on {order.networkName}
                </p>
                <p className="text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {order.verifiedAt && (
                  <span className="text-xs font-medium text-emerald-700">✓ verified with Mesh</span>
                )}
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[order.status]}`}>
                  {order.status}
                </span>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
              <Row label="Order ID" value={order.transactionId} />
              <Row label="Destination" value={order.toAddress} />
              {order.transfer && (
                <>
                  <Row label="Mesh status" value={order.transfer.meshStatus} />
                  <Row label="Sent" value={`${order.transfer.amount} ${order.transfer.symbol ?? ''}`} />
                  <Row label="Fees" value={order.transfer.feesInFiat != null ? `$${order.transfer.feesInFiat.toFixed(2)}` : undefined} />
                  <Row label="Transaction hash" value={order.transfer.txHash} />
                  <Row label="Mesh transfer ID" value={order.transfer.transferId} />
                </>
              )}
              <Row label="Verified at" value={order.verifiedAt && new Date(order.verifiedAt).toLocaleString()} />
              <Row label="Note" value={order.error} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-all font-mono">{value}</dd>
    </>
  )
}
