import { Checkout } from '@/components/Checkout'

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex h-48 items-center justify-center rounded-xl bg-slate-100 text-7xl">
        👟
      </div>
      <div className="mt-5 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Pair of shoes</h1>
        <p className="text-xl font-semibold">$50.00</p>
      </div>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Comfortable everyday trainers. Pay straight from your Coinbase account.
      </p>
      <Checkout />
    </div>
  )
}
