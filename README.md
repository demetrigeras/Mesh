# Mesh Connect demo

A small Next.js (App Router) + TypeScript + Tailwind app that shows three Mesh flows against the sandbox:

1. **Connect Coinbase**: link an account with Mesh Link and store its access token on the server.
2. **Portfolio**: read that account's holdings and show amounts, fiat values and a total.
3. **Pay with crypto**: buy a $50 pair of shoes with USDC on Ethereum.

It runs in **mock mode** with no credentials, so the UI can be developed and demoed before sandbox access arrives.

## Setup

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. With the default `.env.local` the app starts in mock mode and shows an amber banner saying so.

## Environment variables

| Variable | Purpose |
|---|---|
| `MESH_CLIENT_ID` | Client ID from the Mesh dashboard (Account > API keys). |
| `MESH_CLIENT_SECRET` | Sandbox API key. Needs Read & Write permission for transfers. Server-side only. |
| `MESH_MOCK` | `true` for fake responses and a simulated Link popup, `false` for the real sandbox. |
| `MESH_BASE_URL` | Optional. Defaults to `https://sandbox-integration-api.meshconnect.com`. |

Mock mode is also used automatically whenever either credential is empty.

### Switching to the real sandbox

1. Put your Client ID and sandbox API key in `.env.local`.
2. Change one line: `MESH_MOCK=false`.
3. In the Mesh dashboard, under Account > API keys > Access, add `localhost:3000` as an allowed domain. The Link SDK will not load on a domain that is not listed.
4. Restart `npm run dev`.

## Demo flow

1. **Home page**: click **Connect Coinbase**. In the sandbox, log in with username `Mesh`, password `Pass123`, MFA code `123456`. The card switches to "Connected".
2. **Portfolio**: shows each holding's symbol, amount and USD value, with a total.
3. **Shop**: with an account connected, the checkout shows your USDC balance and whether it covers the price. Click **Pay with crypto**, log in the same way and approve the transfer. A success screen shows the transfer details, then a "Verified by server" line once the server has confirmed the transfer with Mesh. Closing Link without paying shows a "cancelled" notice instead.
4. **Orders**: every payment attempt with its status. Paid orders show "verified with Mesh". Orders Mesh was still processing are re-checked each time the page loads.
5. **Store**: the merchant's view, built from Mesh's transfer records: number of payments, total received, and fees broken down by who charges them.
6. **Consoles**: the terminal prints every Mesh request and response. The browser console (F12) prints every call from the browser to this app (`[app]`) and every Mesh Link callback (`[mesh link]`).

In mock mode the Link step is a simulated popup with **Approve**, **Cancel** and **Simulate an error** buttons, which fire the same callbacks as the real SDK.

## How it works

```
Browser                         Next.js server                    Mesh API
-------                         --------------                    --------
Connect Coinbase  ─POST /api/connect-token──►  GET  integrations ──►
                                            POST linktoken ─────►
  openLink(linkToken) ◄──────── linkToken
  onIntegrationConnected
                  ─POST /api/connection──►  store accessToken in memory

Portfolio page (server component)           POST holdings/get ──►

Pay with crypto   ─POST /api/payment-token► GET  networks ──────►
                                            POST linktoken ─────►
  openLink(linkToken) ◄──────── linkToken + order
  onTransferFinished → success screen
                  ─POST /api/orders/verify► GET  transfers/managed/mesh ►
                                            order marked "paid" only if Mesh
                                            reports a matching, succeeded transfer
  onExit             → cancelled / error notice
                  ─PATCH /api/orders─────►  order marked cancelled / failed

Shop page loads   ─GET /api/balance──────►  POST holdings/get ──► (USDC only)
```

### Files

| File | What it does |
|---|---|
| `lib/mesh/client.ts` | `meshFetch`: the only code that touches credentials. Adds auth headers, logs every call, and switches to mock responses. |
| `lib/mesh/api.ts` | The Mesh operations the app needs: connect token, payment token, holdings, USDC balance, transfer lookup, and the network and integration lookups. |
| `lib/mesh/mock.ts` | Fake responses in the same shape as the real API. |
| `lib/mesh/types.ts` | Types for the Mesh responses and for what our routes return. |
| `lib/session.ts` | In-memory store for the connected account's access token and broker type. |
| `lib/orders.ts` | Order history, kept in `.data/orders.json`. |
| `lib/verifyOrder.ts` | Server-side payment verification: looks the transfer up at Mesh and checks it matches the order. |
| `app/api/*/route.ts` | Thin routes the browser calls: `connect-token`, `payment-token`, `connection`, `balance`, `orders`, `orders/verify`. |
| `components/useMeshLink.tsx` | Opens the real Mesh Link SDK, or the simulated popup in mock mode. |
| `components/ConnectCoinbase.tsx`, `components/Checkout.tsx` | The connect button and the checkout. |
| `components/PaymentBalance.tsx` | The USDC balance line at checkout. |
| `components/callApi.ts` | `fetch` wrapper that logs each browser-to-server call to the browser console. |
| `app/page.tsx`, `app/shop/page.tsx`, `app/portfolio/page.tsx`, `app/orders/page.tsx`, `app/store/page.tsx` | The five pages. |

### Design choices

- **The secret stays on the server.** `lib/mesh/client.ts` imports `server-only`, so the build fails if it is ever pulled into browser code.
- **The access token stays on the server too.** The browser receives it from Mesh Link, posts it to `/api/connection` once, and never reads it back. The portfolio is a server component, so the holdings call happens entirely server-side.
- **The server decides what is being paid.** Price, token, network and destination address are set in `createPaymentSession`; the browser sends no parameters.
- **The server decides what is paid.** The browser's `onTransferFinished` callback only triggers a check. The server looks the transfer up at Mesh by `transactionId` and marks the order paid only if it succeeded and matches the order's token, network, address and amount. Mesh keeps a new transfer `pending` for a while, so the server polls every 3 seconds for up to 2 minutes. The browser cannot set an order to paid.
- **IDs are looked up, not hardcoded.** The Ethereum `networkId` comes from the networks endpoint (the EVM network with `chainId` 1, since Injective also reports `chainId` 1), and the Coinbase `integrationId` from the integrations endpoint (preferring the `sandboxCoinbase` row, which accepts the test login).
- **Broker type is stored, not assumed.** The sandbox reports Coinbase as `sandboxCoinbase`, so the holdings call uses whatever type Mesh Link returned.
- **Logs are safe to show.** Access tokens and link tokens are truncated in the console output, and the client secret is never logged.

## Things to verify in the sandbox

Confirmed in the sandbox: payments complete end to end, and Mesh records them as `transferType: "payment"`, `succeeded`, for exactly $50.00 of USDC.

One point is still marked `// VERIFY` in `lib/mesh/api.ts`: whether the buyer can edit the amount inside Link. Server-side verification rejects an underpayment either way.

## Demo limitations

- The session store is a single in-memory slot: it resets on restart and is shared by all visitors. A real app would store tokens encrypted in a database, per user.
- Verification is triggered by the browser (after the callback, or when the Orders page loads) and works by polling. A real store would also receive Mesh's transfer status webhooks, so an order is confirmed even if the buyer closes the tab.
- Orders are kept in a local JSON file, which is not safe for concurrent users.
- Access tokens are not refreshed when they expire.
#   M e s h  
 