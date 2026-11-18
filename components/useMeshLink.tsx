'use client'

import { useState } from 'react'
import type { LinkOptions, LinkPayload, TransferFinishedPayload } from '@meshconnect/web-link-sdk'
import type { LinkSession } from '@/lib/mesh/types'
import { maskTokens, reportActivity } from './activity'

export interface MeshLinkHandlers {
  onIntegrationConnected?: (payload: LinkPayload) => void
  onTransferFinished?: (payload: TransferFinishedPayload) => void
  onExit?: (error?: string) => void
}

/**
 * Opens Mesh Link for a session created by one of our token routes.
 * Real mode uses the Mesh web SDK. Mock mode shows a simulated popup that
 * fires the same callbacks, so pages are written once for both modes.
 *
 * Usage: const { open, mockPopup } = useMeshLink(handlers), then render {mockPopup}.
 */
export function useMeshLink(handlers: MeshLinkHandlers) {
  const [mockSession, setMockSession] = useState<LinkSession | null>(null)

  /** Log a callback to the browser console and the Activity page. */
  function logCallback(title: string, payload?: unknown) {
    const safe = maskTokens(payload)
    console.log(`[mesh link] ${title}`, safe ?? '')
    reportActivity({ kind: 'callback', time: Date.now(), title, response: safe })
  }

  // The page's handlers, each logged before it runs. Used by both the real
  // SDK and the mock popup.
  const logged: MeshLinkHandlers = {
    onIntegrationConnected: (payload) => {
      logCallback('onIntegrationConnected', payload)
      handlers.onIntegrationConnected?.(payload)
    },
    onTransferFinished: (payload) => {
      logCallback('onTransferFinished', payload)
      handlers.onTransferFinished?.(payload)
    },
    onExit: (error) => {
      logCallback('onExit', error ? { error } : undefined)
      handlers.onExit?.(error)
    },
  }

  async function open(session: LinkSession) {
    if (session.mock) {
      setMockSession(session)
      return
    }
    // Loaded on demand because the SDK needs the browser's `window`.
    const { createLink } = await import('@meshconnect/web-link-sdk')
    const link = createLink({
      // Returning buyer: Link starts on the payment and skips the login.
      // Cast because the SDK's BrokerType list may not include sandbox values.
      accessTokens: session.accessTokens as LinkOptions['accessTokens'],
      ...logged,
      // Every step the user takes inside the modal (page loaded, integration
      // selected, MFA entered, transfer previewed…).
      onEvent: (event) =>
        logCallback(`onEvent: ${event.type}`, (event as { payload?: unknown }).payload),
    })
    link.openLink(session.linkToken)
  }

  const mockPopup = mockSession && (
    <MockLinkPopup
      session={mockSession}
      handlers={logged}
      close={() => setMockSession(null)}
    />
  )

  return { open, mockPopup }
}

// ---- Mock mode only: a stand-in for the Mesh Link popup ----

function MockLinkPopup({
  session,
  handlers,
  close,
}: {
  session: LinkSession
  handlers: MeshLinkHandlers
  close: () => void
}) {
  const { order } = session
  const returning = session.accessTokens?.[0] // set when the buyer is already connected

  const mockConnection = {
    accessToken: {
      brokerType: 'sandboxCoinbase',
      brokerName: 'Coinbase',
      brokerBrandInfo: { brokerLogo: '' },
      accountTokens: [
        {
          accessToken: 'mock-access-token',
          account: { accountId: 'mock-account-1', accountName: 'Mock Coinbase account' },
        },
      ],
    },
    // Same shape the real SDK sends. Cast because the installed SDK's
    // BrokerType list may not include the sandbox value.
  } as unknown as LinkPayload

  function approve() {
    if (order) {
      // A first-time buyer connects their account on the way to paying.
      if (!returning) handlers.onIntegrationConnected?.(mockConnection)
      handlers.onTransferFinished?.({
        status: 'success',
        txId: `mock-transfer-${Date.now()}`,
        txHash: '0x' + crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'),
        fromAddress: '0xA9D1e08C7793af67e9d92fe308d5697FB81d3E43',
        toAddress: order.toAddress,
        symbol: order.symbol,
        amount: order.amountInFiat, // USDC is 1:1 with USD
        amountInFiat: order.amountInFiat,
        networkId: order.networkId,
        networkName: order.networkName,
        clientTransactionId: order.transactionId,
      })
    } else {
      handlers.onIntegrationConnected?.(mockConnection)
    }
    close()
  }

  function exit(error?: string) {
    handlers.onExit?.(error)
    close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Simulated Mesh Link
        </p>
        <h2 className="mt-1 text-lg font-semibold">
          {order ? 'Approve payment' : 'Connect Coinbase'}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {order
            ? `Send $${order.amountInFiat} of ${order.symbol} on ${order.networkName} from your Coinbase account.`
            : 'In the real sandbox you would log in with Mesh / Pass123 and MFA 123456.'}
        </p>
        {order && (
          <p className="mt-2 text-sm text-slate-500">
            {returning
              ? `Welcome back. Paying from ${returning.accountName}, no login needed.`
              : 'First purchase: in the real sandbox you would log in to Coinbase here.'}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={approve} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            {order ? 'Approve transfer' : 'Log in and connect'}
          </button>
          <button onClick={() => exit()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => exit('Simulated error: transfer could not be completed')} className="px-4 py-1 text-xs text-slate-500 hover:text-slate-800">
            Simulate an error
          </button>
        </div>
      </div>
    </div>
  )
}
