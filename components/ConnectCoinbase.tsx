'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LinkPayload } from '@meshconnect/web-link-sdk'
import type { LinkSession } from '@/lib/mesh/types'
import { callApi } from './callApi'
import { useMeshLink } from './useMeshLink'

interface Props {
  initialAccountName?: string // set when an account is already connected
}

export function ConnectCoinbase({ initialAccountName }: Props) {
  const [accountName, setAccountName] = useState(initialAccountName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const { open, mockPopup } = useMeshLink({
    onIntegrationConnected: saveConnection,
    onExit: (exitError) => {
      setBusy(false)
      if (exitError) setError(exitError)
    },
  })

  async function connect() {
    setBusy(true)
    setError(undefined)
    try {
      const session = await callApi<LinkSession>('POST', '/api/connect-token')
      await open(session)
    } catch (caught) {
      setError((caught as Error).message)
      setBusy(false)
    }
  }

  /** Hand the token to our server straight away; the browser does not keep it. */
  async function saveConnection(payload: LinkPayload) {
    const token = payload.accessToken
    const account = token?.accountTokens[0]
    if (!token || !account) {
      setError('Mesh Link did not return an access token')
      return
    }
    await callApi('POST', '/api/connection', {
      accessToken: account.accessToken,
      brokerType: token.brokerType,
      brokerName: token.brokerName,
      accountName: account.account.accountName,
    })
    setAccountName(account.account.accountName)
    setBusy(false)
  }

  async function disconnect() {
    await callApi('DELETE', '/api/connection')
    setAccountName(undefined)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Coinbase account</h2>

      {accountName ? (
        <>
          <p className="mt-2 text-sm text-emerald-700">Connected: {accountName}</p>
          <div className="mt-4 flex gap-3">
            <Link href="/portfolio" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              View portfolio
            </Link>
            <button onClick={disconnect} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">
            Connect an account to view its holdings on the portfolio page.
          </p>
          <button onClick={connect} disabled={busy} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            {busy ? 'Opening Mesh Link…' : 'Connect Coinbase'}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {mockPopup}
    </div>
  )
}
