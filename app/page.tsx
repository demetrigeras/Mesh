import Link from 'next/link'
import { ConnectCoinbase } from '@/components/ConnectCoinbase'
import { getConnection } from '@/lib/session'

export default function HomePage() {
  const connection = getConnection()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mesh Connect demo</h1>
        <p className="mt-1 text-slate-600">
          Connect a Coinbase account, view its holdings, and pay for an order in crypto.
        </p>
      </div>

      <ConnectCoinbase initialAccountName={connection?.accountName} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Shop</h2>
        <p className="mt-2 text-sm text-slate-600">Buy a $50 pair of shoes with USDC.</p>
        <Link href="/shop" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Go to shop
        </Link>
      </div>
    </div>
  )
}
