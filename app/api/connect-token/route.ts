import { NextResponse } from 'next/server'
import { createConnectSession } from '@/lib/mesh/api'

/** POST /api/connect-token: link token for connecting a Coinbase account. */
export async function POST() {
  try {
    return NextResponse.json(await createConnectSession())
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
