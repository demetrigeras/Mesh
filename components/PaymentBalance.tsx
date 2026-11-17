'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PaymentBalance as Balance } from '@/lib/mesh/types'
import { callApi } from './callApi'

/**
 * Shown above the pay button: how much USDC the buyer's connected Coinbase
 * account holds, and whether that covers the price. It never blocks payment;
 * Mesh Link does the real check when the buyer confirms.
 */
export function PaymentBalance() {
  const [balance, setBalance] = useState<Balance>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    callApi<Balance>('GET', '/api/balance')
      .then(setBalance)
      .catch(() => setFailed(true))
  }, [])

  if (failed) return <Box tone="slate">Could not load your balance. You can still pay.</Box>
  if (!balance) return <Box tone="slate">Checking your USDC balance…</Box>

  if (!balance.connected) {
    return (
      <Box tone="slate">
        <Link href="/" className="text-blue-600 underline">Connect Coinbase</Link> to see your
        USDC balance before you pay.
      </Box>
    )
  }

  const enough = balance.fiatValue >= balance.priceUsd
  const amount = balance.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })

  return (
    <Box tone={enough ? 'emerald' : 'amber'}>
      <span className="font-medium">
        {amount} {balance.symbol}
      </span>{' '}
      available in {balance.accountName}.{' '}
      {enough
        ? `Enough to cover $${balance.priceUsd.toFixed(2)}.`
        : `This order needs $${balance.priceUsd.toFixed(2)}, so you may need to top up first.`}
    </Box>
  )
}

const TONES = {
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
}

function Box({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return <div className={`mb-4 rounded-lg border p-3 text-sm ${TONES[tone]}`}>{children}</div>
}
