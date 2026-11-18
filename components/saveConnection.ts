import type { LinkPayload } from '@meshconnect/web-link-sdk'
import { callApi } from './callApi'

/**
 * Called from onIntegrationConnected. Hands the access token Mesh Link gave
 * the browser to our server, which keeps it for the holdings call and for
 * letting this buyer skip the login next time.
 * Returns the connected account's name, or undefined if Link sent no token.
 */
export async function saveConnection(payload: LinkPayload): Promise<string | undefined> {
  const token = payload.accessToken
  const account = token?.accountTokens[0]
  if (!token || !account) return undefined

  await callApi('POST', '/api/connection', {
    accessToken: account.accessToken,
    brokerType: token.brokerType,
    brokerName: token.brokerName,
    accountId: account.account.accountId,
    accountName: account.account.accountName,
  })
  return account.account.accountName
}
