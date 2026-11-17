import Link from 'next/link'
import { getHoldings } from '@/lib/mesh/api'
import { getConnection } from '@/lib/session'
import type { Position } from '@/lib/mesh/types'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** Server component: the Mesh call and the access token never reach the browser. */
export default async function PortfolioPage() {
  const connection = getConnection()

  if (!connection) {
    return (
      <Notice title="No account connected">
        <Link href="/" className="text-blue-600 underline">Connect Coinbase</Link> to see your holdings.
      </Notice>
    )
  }

  let positions: Position[]
  try {
    const holdings = await getHoldings(connection)
    positions = [...holdings.cryptocurrencyPositions].sort(
      (a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0),
    )
  } catch (error) {
    return <Notice title="Could not load holdings">{(error as Error).message}</Notice>
  }

  const total = positions.reduce((sum, position) => sum + (position.marketValue ?? 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      <p className="mt-1 text-slate-600">
        {connection.brokerName} · {connection.accountName}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Asset</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 text-right font-medium">Value (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {positions.map((position) => (
              <tr key={position.symbol}>
                <td className="px-5 py-3">
                  <span className="font-medium">{position.symbol}</span>
                  {position.name && <span className="ml-2 text-slate-500">{position.name}</span>}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{position.amount}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {position.marketValue != null ? usd.format(position.marketValue) : '—'}
                </td>
              </tr>
            ))}
            {positions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-center text-slate-500">
                  This account holds no crypto.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <td className="px-5 py-3" colSpan={2}>Total</td>
              <td className="px-5 py-3 text-right tabular-nums">{usd.format(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}
