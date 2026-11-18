'use client'

import { useRef, useState } from 'react'
import type { TransferFinishedPayload } from '@meshconnect/web-link-sdk'
import type { LinkSession, PaymentOrder } from '@/lib/mesh/types'
import { callApi } from './callApi'
import { PaymentBalance } from './PaymentBalance'
import { saveConnection } from './saveConnection'
import { useMeshLink } from './useMeshLink'

// The checkout is always in exactly one of these states.
type Checkout =
  | { step: 'idle' }
  | { step: 'paying'; order?: PaymentOrder }
  | { step: 'success'; order?: PaymentOrder; transfer: TransferFinishedPayload }
  | { step: 'cancelled'; error?: string }

// The parts of the server's order record that the success screen shows.
interface VerifiedOrder {
  status: string
  verifiedAt?: string
  error?: string
  transfer?: { feesInFiat?: number; infoUrl?: string }
}

export function Checkout() {
  const [checkout, setCheckout] = useState<Checkout>({ step: 'idle' })
  // The server's verdict on the order; undefined while it is still checking.
  const [verified, setVerified] = useState<VerifiedOrder>()

  // The order currently being paid, and whether it has already succeeded.
  const order = useRef<PaymentOrder | undefined>(undefined)
  const paid = useRef(false)

  const { open, mockPopup } = useMeshLink({
    // A first-time buyer logs in to Coinbase inside Link. Save that connection
    // so the next purchase can skip the login.
    onIntegrationConnected: (payload) => {
      saveConnection(payload).catch((error) =>
        console.error('[app] could not save the connection', error),
      )
    },
    onTransferFinished: (transfer) => {
      paid.current = true
      setCheckout({ step: 'success', order: order.current, transfer })
      verifyWithServer()
    },
    // Link also calls onExit when the user closes it after a successful
    // transfer, so only treat an exit as "cancelled" if we have not succeeded.
    onExit: (error) => {
      if (paid.current) return
      setCheckout({ step: 'cancelled', error })
      reportOutcome(error ? { status: 'failed', error } : { status: 'cancelled' })
    },
  })

  /**
   * The callback says the transfer finished, but the browser is not trusted to
   * mark an order paid. Ask our server to confirm it with Mesh directly.
   */
  async function verifyWithServer() {
    if (!order.current) return
    setVerified(undefined)
    try {
      const { transactionId } = order.current
      setVerified(await callApi<VerifiedOrder>('POST', '/api/orders/verify', { transactionId }))
    } catch (caught) {
      setVerified({ status: 'pending', error: (caught as Error).message })
    }
  }

  /** Tell the server the buyer left without paying. */
  function reportOutcome(outcome: object) {
    if (!order.current) return
    callApi('PATCH', '/api/orders', {
      transactionId: order.current.transactionId,
      ...outcome,
    }).catch((error) => console.error('[app] could not update the order', error))
  }

  async function pay() {
    setCheckout({ step: 'paying' })
    order.current = undefined
    paid.current = false
    try {
      const session = await callApi<LinkSession>('POST', '/api/payment-token')
      order.current = session.order
      setCheckout({ step: 'paying', order: order.current })
      await open(session)
    } catch (caught) {
      setCheckout({ step: 'cancelled', error: (caught as Error).message })
    }
  }

  if (checkout.step === 'success') {
    const { transfer, order } = checkout
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-800">Payment sent</h2>
        <p className="mt-1 text-sm text-emerald-700">Your shoes are on the way.</p>
        <p className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm">
          {!verified && 'Server is confirming the transfer with Mesh. This can take a minute…'}
          {verified?.verifiedAt && (
            <>
              <span className="font-medium text-emerald-700">✓ Verified by server.</span> Mesh
              confirms the transfer succeeded and matches the order
              {verified.transfer?.feesInFiat != null && ` (fees $${verified.transfer.feesInFiat.toFixed(2)})`}.
              {verified.transfer?.infoUrl && (
                <a href={verified.transfer.infoUrl} target="_blank" rel="noreferrer" className="ml-1 text-blue-600 underline">
                  View transaction
                </a>
              )}
            </>
          )}
          {verified && !verified.verifiedAt && (
            <span className="text-amber-700">
              Not verified yet: {verified.error ?? `Mesh reports the transfer as ${verified.status}`}.
              The Orders page will update once Mesh confirms it.
            </span>
          )}
        </p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <Detail label="Status" value={transfer.status} />
          <Detail label="Order ID" value={transfer.clientTransactionId ?? order?.transactionId} />
          <Detail label="Amount" value={`${transfer.amount} ${transfer.symbol}`} />
          <Detail label="Fiat value" value={transfer.amountInFiat != null ? `$${transfer.amountInFiat.toFixed(2)}` : undefined} />
          <Detail label="Network" value={transfer.networkName ?? order?.networkName} />
          <Detail label="From" value={transfer.fromAddress} />
          <Detail label="To" value={transfer.toAddress} />
          <Detail label="Transaction hash" value={transfer.txHash} />
          <Detail label="Mesh transfer ID" value={transfer.transferId ?? transfer.txId} />
        </dl>
        <button onClick={() => setCheckout({ step: 'idle' })} className="mt-6 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium hover:bg-emerald-100">
          Buy another pair
        </button>
      </div>
    )
  }

  return (
    <div>
      {checkout.step === 'cancelled' && (
        <div className={`mb-4 rounded-lg border p-4 text-sm ${checkout.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {checkout.error
            ? `Payment failed: ${checkout.error}`
            : 'Payment cancelled. You have not been charged.'}
        </div>
      )}
      <PaymentBalance />
      <button onClick={pay} disabled={checkout.step === 'paying'} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500 disabled:opacity-50">
        {checkout.step === 'paying' ? 'Waiting for Mesh Link…' : 'Pay with crypto'}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">$50.00 in USDC on Ethereum</p>
      {mockPopup}
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-all font-mono text-slate-900">{value}</dd>
    </>
  )
}
