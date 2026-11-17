import 'server-only'

import { isMockMode, meshFetch, MeshError } from './client'
import type {
  HoldingsContent,
  IntegrationsContent,
  LinkSession,
  LinkTokenContent,
  MeshNetwork,
  MeshTransfer,
  NetworksContent,
  TransfersContent,
  PaymentBalance,
  PaymentOrder,
} from './types'
import type { Connection } from '../session'

// A real app would use the signed-in user's ID. Mesh asks for a non-PII value.
const DEMO_USER_ID = 'demo-user-1'

// The $50 pair of shoes.
const PRODUCT = { description: 'Pair of shoes', priceUsd: 50 }
const PAYMENT_SYMBOL = 'USDC'
const MERCHANT_ADDRESS = '0x0Ff0000f0A0f0000F0F000000000ffFf00f0F0f0'

/** Link token for the "Connect Coinbase" button (account linking only). */
export async function createConnectSession(): Promise<LinkSession> {
  const content = await meshFetch<LinkTokenContent>('POST', '/api/v1/linktoken', {
    userId: DEMO_USER_ID,
    restrictMultipleAccounts: true,
    // Opens Link directly on Coinbase. Left out if we cannot find its ID,
    // in which case Link shows its normal list of integrations.
    integrationId: await findCoinbaseIntegrationId(),
  })
  return { linkToken: content.linkToken, mock: isMockMode() }
}

/** Link token for "Pay with crypto": a fixed $50 USDC payment on Ethereum. */
export async function createPaymentSession(): Promise<LinkSession> {
  const ethereum = await findEthereumNetwork()

  const order: PaymentOrder = {
    transactionId: `order-${crypto.randomUUID()}`,
    description: PRODUCT.description,
    amountInFiat: PRODUCT.priceUsd,
    symbol: PAYMENT_SYMBOL,
    networkId: ethereum.id,
    networkName: ethereum.name,
    toAddress: MERCHANT_ADDRESS,
  }

  const content = await meshFetch<LinkTokenContent>('POST', '/api/v1/linktoken', {
    userId: DEMO_USER_ID,
    restrictMultipleAccounts: true,
    transferOptions: {
      toAddresses: [
        { networkId: order.networkId, symbol: order.symbol, address: order.toAddress },
      ],
      // Fixed USD amount. Sandbox transfers come back as exactly $50.00.
      // VERIFY: confirm the buyer cannot edit the amount inside Link. Either
      // way, verifyOrder rejects a transfer that pays less than the price.
      amountInFiat: order.amountInFiat,
      transactionId: order.transactionId,
      // "payment" (paying a merchant) rather than the quickstart's "deposit"
      // (funding your own account). Confirmed in sandbox: Mesh records the
      // transfer with transferType "payment".
      transferType: 'payment',
      isInclusiveFeeEnabled: false, // fees are added on top; the merchant receives the full $50
    },
  })

  return { linkToken: content.linkToken, mock: isMockMode(), order }
}

/** Holdings for the connected account, with fiat values. */
export async function getHoldings(connection: Connection): Promise<HoldingsContent> {
  const content = await meshFetch<HoldingsContent>('POST', '/api/v1/holdings/get', {
    authToken: connection.accessToken,
    type: connection.brokerType, // "sandboxCoinbase" in sandbox, so never hardcoded
    includeMarketValue: true,
  })
  if (content.status !== 'succeeded') {
    throw new MeshError(content.errorMessage || `Holdings request ${content.status}`)
  }
  return content
}

/**
 * How much of the payment token (USDC) the connected account holds, shown at
 * checkout so the buyer knows whether they can cover the price before paying.
 * Mesh returns all holdings in one call, so we read them and pick out USDC.
 */
export async function getPaymentBalance(connection: Connection): Promise<PaymentBalance> {
  const holdings = await getHoldings(connection)
  const position = holdings.cryptocurrencyPositions.find((p) => p.symbol === PAYMENT_SYMBOL)
  const amount = position?.amount ?? 0
  return {
    connected: true,
    accountName: connection.accountName,
    symbol: PAYMENT_SYMBOL,
    amount,
    // USDC is pegged to the dollar, so its amount is a fair stand-in if Mesh
    // returns no market value.
    fiatValue: position?.marketValue ?? amount,
    priceUsd: PRODUCT.priceUsd,
  }
}

/**
 * Ask Mesh what happened to an order's transfer. This is the server-side
 * check: it does not rely on anything the browser told us.
 */
export async function findTransfer(
  transactionId: string,
  { quiet = false } = {}, // quiet = log one line instead of the full payloads
): Promise<MeshTransfer | undefined> {
  const { items } = await meshFetch<TransfersContent>(
    'GET',
    `/api/v1/transfers/managed/mesh?ClientTransactionId=${encodeURIComponent(transactionId)}`,
    undefined,
    { quiet },
  )
  // One order can have several attempts (e.g. a failed try, then a success).
  return items.find((t) => t.status === 'succeeded') ?? items[0]
}

/**
 * Every successful payment to the store's address, newest first, straight
 * from Mesh's records. This is the merchant's view: what the store received.
 */
export async function listStorePayments(): Promise<MeshTransfer[]> {
  const { items } = await meshFetch<TransfersContent>(
    'GET',
    '/api/v1/transfers/managed/mesh?Statuses=succeeded&Count=100&OrderBy=createdTimestamp&DescendingOrder=true',
  )
  return items.filter(
    (t) => t.destinationAddress?.toLowerCase() === MERCHANT_ADDRESS.toLowerCase(),
  )
}

// ---- Lookups (so IDs are not hardcoded) ----

async function findEthereumNetwork(): Promise<MeshNetwork> {
  const { networks } = await meshFetch<NetworksContent>(
    'GET',
    '/api/v1/transfers/managed/networks',
  )
  // chainId "1" alone is not enough: the sandbox also lists Injective with
  // chainId "1". Ethereum is the EVM network with that chain ID.
  const ethereum = networks.find((n) => n.networkType === 'evm' && n.chainId === '1')
  if (!ethereum) throw new MeshError('Ethereum was not in the Mesh networks list')
  return ethereum
}

async function findCoinbaseIntegrationId(): Promise<string | undefined> {
  try {
    const { integrations } = await meshFetch<IntegrationsContent>(
      'GET',
      '/api/v1/transfers/managed/integrations',
    )
    // The sandbox lists two Coinbase rows: "sandboxCoinbase" (accepts the test
    // login Mesh / Pass123) and "coinbase" (the real exchange). Prefer the
    // sandbox one when it exists; production only has "coinbase".
    const byType = (type: string) => integrations.find((i) => i.type === type)?.id
    return byType('sandboxCoinbase') ?? byType('coinbase')
  } catch {
    return undefined // deep-linking is a nicety; connecting still works without it
  }
}
