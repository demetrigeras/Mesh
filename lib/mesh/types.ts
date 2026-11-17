// Shapes of the Mesh API responses we use, trimmed to the fields this demo reads.
// Field names come from the OpenAPI schemas on docs.meshconnect.com.

/** Every Mesh response is wrapped in this envelope. */
export interface MeshEnvelope<T> {
  content: T
  status: string // "ok" on success
  message?: string
  displayMessage?: string
  errorType?: string
}

/** POST /api/v1/linktoken */
export interface LinkTokenContent {
  linkToken: string
}

/** GET /api/v1/transfers/managed/networks */
export interface NetworksContent {
  networks: MeshNetwork[]
}
export interface MeshNetwork {
  id: string // this is the networkId used in transferOptions
  name: string
  chainId: string
  networkType?: string // e.g. "evm"
  nativeSymbol?: string
  supportedTokens?: string[]
}

/** GET /api/v1/transfers/managed/integrations */
export interface IntegrationsContent {
  integrations: MeshIntegration[]
}
export interface MeshIntegration {
  id: string
  name: string
  type: string
}

/** POST /api/v1/holdings/get */
export interface HoldingsContent {
  status: string // "succeeded" | "failed" | "notAuthorized"
  errorMessage?: string
  institutionName?: string
  accountName?: string
  cryptocurrencyPositions: Position[]
  equityPositions?: Position[]
}
export interface Position {
  symbol: string
  name?: string
  amount: number
  marketValue?: number // fiat (USD) value; present when includeMarketValue is true
  lastPrice?: number
  costBasis?: number
}

/** GET /api/v1/transfers/managed/mesh */
export interface TransfersContent {
  items: MeshTransfer[]
  total: number
}
export interface MeshFee {
  fee: number // in feeCurrency
  feeCurrency?: string
  feeInFiat: number
}
export interface MeshTransfer {
  id: string // Mesh's own transfer ID
  clientTransactionId?: string // the transactionId we sent in the link token
  status: 'pending' | 'succeeded' | 'failed' | 'expired'
  amount: number
  symbol?: string
  amountInFiat: number
  totalFeesAmountInFiat?: number
  // Fee breakdown. Each part is absent when it does not apply.
  gasFee?: MeshFee // network fee
  withdrawalFee?: MeshFee // charged by the exchange for sending crypto out
  processingFee?: MeshFee // Mesh's own fee
  createdTimestamp?: number // Unix seconds
  from?: { name?: string; type?: string } // where the buyer paid from
  networkId: string
  networkName?: string
  destinationAddress?: string
  hash?: string
  infoUrl?: string // block explorer link
  transferType?: string
}

// ---- Shapes passed between our own API routes and the browser ----

/** The order a payment link token was created for. */
export interface PaymentOrder {
  transactionId: string
  description: string
  amountInFiat: number
  symbol: string
  networkId: string
  networkName: string
  toAddress: string
}

/** What GET /api/balance returns: the buyer's USDC balance next to the price. */
export type PaymentBalance =
  | { connected: false }
  | {
      connected: true
      accountName: string
      symbol: string
      amount: number
      fiatValue: number
      priceUsd: number
    }

/** What our token routes return to the browser. Never contains credentials. */
export interface LinkSession {
  linkToken: string
  mock: boolean // true = show the simulated Link popup instead of the real SDK
  order?: PaymentOrder
}
