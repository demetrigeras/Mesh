import { listStorePayments } from '@/lib/mesh/api'
import type { MeshTransfer } from '@/lib/mesh/types'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// The parts of a transfer's fee that Mesh reports, and who charges each one.
const FEE_TYPES = [
  { key: 'withdrawalFee', label: 'Exchange withdrawal fee', chargedBy: 'Coinbase, for sending crypto out' },
  { key: 'gasFee', label: 'Network (gas) fee', chargedBy: 'The Ethereum network' },
  { key: 'processingFee', label: 'Processing fee', chargedBy: 'Mesh' },
] as const

/**
 * The merchant's view. Everything here comes from Mesh's own transfer
 * records (GET /api/v1/transfers/managed/mesh), not from this app's order file.
 */
export default async function StorePage() {
  let payments: MeshTransfer[]
  try {
    payments = await listStorePayments()
  } catch (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold">Could not load payments</h1>
        <p className="mt-2 text-sm text-slate-600">{(error as Error).message}</p>
      </div>
    )
  }

  const sum = (pick: (payment: MeshTransfer) => number | undefined) =>
    payments.reduce((total, payment) => total + (pick(payment) ?? 0), 0)

  const received = sum((p) => p.amountInFiat)
  const fees = sum((p) => p.totalFeesAmountInFiat)

  return (
    <div>
      <h1 className="text-2xl font-semibold">Store dashboard</h1>
      <p className="mt-1 text-slate-600">
        What the store has been paid, according to Mesh&apos;s transfer records.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Payments" value={String(payments.length)} />
        <Stat label="Total received" value={usd.format(received)} note="Paid to the store" />
        <Stat label="Total fees" value={usd.format(fees)} note="Paid by buyers, on top" />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Fee breakdown</h2>
      <p className="mt-1 text-sm text-slate-600">
        Fees are added on top of the price, so the store receives the full $50 for each order.
        The store adds no markup of its own.
      </p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Fee</th>
              <th className="px-5 py-3 font-medium">Charged by</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FEE_TYPES.map(({ key, label, chargedBy }) => (
              <tr key={key}>
                <td className="px-5 py-3">{label}</td>
                <td className="px-5 py-3 text-slate-500">{chargedBy}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {usd.format(sum((p) => p[key]?.feeInFiat))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <td className="px-5 py-3" colSpan={2}>All fees</td>
              <td className="px-5 py-3 text-right tabular-nums">{usd.format(fees)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Payments</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">From</th>
              <th className="px-5 py-3 text-right font-medium">Received</th>
              <th className="px-5 py-3 text-right font-medium">Fees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                  {payment.createdTimestamp
                    ? new Date(payment.createdTimestamp * 1000).toLocaleString()
                    : '—'}
                </td>
                <td className="px-5 py-3 font-mono text-xs">{payment.clientTransactionId ?? '—'}</td>
                <td className="px-5 py-3">{payment.from?.name ?? '—'}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                  {payment.amount} {payment.symbol}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {usd.format(payment.totalFeesAmountInFiat ?? 0)}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                  No payments received yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  )
}
