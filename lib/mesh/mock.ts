// Fake Mesh responses for mock mode. Shapes mirror the real API so the rest
// of the app cannot tell the difference. IDs are the example values from the
// Mesh docs; the live sandbox may return different ones.

import type {
  HoldingsContent,
  IntegrationsContent,
  LinkTokenContent,
  MeshEnvelope,
  MeshTransfer,
  NetworksContent,
  TransfersContent,
} from './types'

const ok = <T>(content: T): MeshEnvelope<T> => ({ content, status: 'ok', message: '' })

const linkToken: LinkTokenContent = {
  linkToken: 'bW9jay1saW5rLXRva2VuLWZvci1sb2NhbC1kZXZlbG9wbWVudA==',
}

const networks: NetworksContent = {
  networks: [
    { id: 'e3c7fdd8-b1fc-4e51-85ae-bb276e075611', name: 'Ethereum', chainId: '1', networkType: 'evm', nativeSymbol: 'ETH', supportedTokens: ['ETH', 'USDC', 'USDT'] },
    { id: '7436e9d0-ba42-4d2b-b4c0-8e4e606b2c12', name: 'Polygon', chainId: '137', networkType: 'evm', nativeSymbol: 'POL', supportedTokens: ['POL', 'USDC'] },
    { id: 'aa883b03-120d-477c-a588-37c2afd3ca71', name: 'Base', chainId: '8453', networkType: 'evm', nativeSymbol: 'ETH', supportedTokens: ['ETH', 'USDC'] },
  ],
}

const integrations: IntegrationsContent = {
  integrations: [
    { id: '47624467-e52e-4938-a41a-7926b6c27acf', name: 'Coinbase', type: 'coinbase' },
    { id: '721a5035-029f-4e05-bf3c-009da2fe381b', name: 'Coinbase', type: 'sandboxCoinbase' },
  ],
}

const holdings: HoldingsContent = {
  status: 'succeeded',
  institutionName: 'Coinbase',
  accountName: 'Mock Coinbase account',
  cryptocurrencyPositions: [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0.0421, lastPrice: 97250.0, marketValue: 4094.23 },
    { symbol: 'ETH', name: 'Ethereum', amount: 1.275, lastPrice: 3410.5, marketValue: 4348.39 },
    { symbol: 'USDC', name: 'USD Coin', amount: 820.5, lastPrice: 1.0, marketValue: 820.5 },
    { symbol: 'SOL', name: 'Solana', amount: 12.4, lastPrice: 188.2, marketValue: 2333.68 },
    { symbol: 'DOGE', name: 'Dogecoin', amount: 1503, lastPrice: 0.05, marketValue: 75.15 },
  ],
  equityPositions: [],
}

/** In mock mode every order looks like a successful $50 USDC payment. */
function transfers(query: string): TransfersContent {
  const payment = (clientTransactionId: string, minutesAgo: number): MeshTransfer => ({
    id: '5e7680e0-50ec-49f2-9f76-77ef892226b2',
    clientTransactionId,
    status: 'succeeded',
    amount: 50,
    symbol: 'USDC',
    amountInFiat: 50,
    totalFeesAmountInFiat: 0.01,
    withdrawalFee: { fee: 0.01, feeCurrency: 'USDC', feeInFiat: 0.01 },
    processingFee: { fee: 0, feeCurrency: 'USDC', feeInFiat: 0 },
    createdTimestamp: Math.floor(Date.now() / 1000) - minutesAgo * 60,
    from: { name: 'Coinbase', type: 'sandboxCoinbase' },
    networkId: 'e3c7fdd8-b1fc-4e51-85ae-bb276e075611',
    networkName: 'Ethereum',
    destinationAddress: '0x0Ff0000f0A0f0000F0F000000000ffFf00f0F0f0',
    hash: 'e9157c9ecfdcf2fe83a385b14ae5f27892f057f6a67208b92d25903a6ea611eb',
    transferType: 'payment',
  })

  // A lookup for one order returns that order; otherwise return a short history.
  const transactionId = new URLSearchParams(query).get('ClientTransactionId')
  const items = transactionId
    ? [payment(transactionId, 0)]
    : [payment('order-mock-3', 5), payment('order-mock-2', 90), payment('order-mock-1', 1440)]
  return { total: items.length, items }
}

export function mockMeshResponse(method: string, fullPath: string): MeshEnvelope<unknown> {
  const [path, query = ''] = fullPath.split('?')
  switch (`${method} ${path}`) {
    case 'GET /api/v1/transfers/managed/mesh':
      return ok(transfers(query))
    case 'POST /api/v1/linktoken':
      return ok(linkToken)
    case 'GET /api/v1/transfers/managed/networks':
      return ok(networks)
    case 'GET /api/v1/transfers/managed/integrations':
      return ok(integrations)
    case 'POST /api/v1/holdings/get':
      return ok(holdings)
    default:
      return { content: null, status: 'error', message: `No mock for ${method} ${path}` }
  }
}
