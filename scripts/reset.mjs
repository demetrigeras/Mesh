// npm run reset
//
// Puts the demo back to a "new user, empty store" state:
//   1. deletes the local order history (.data/orders.json)
//   2. forgets the connected Coinbase account (held in the dev server's memory)
//   3. records the reset time, so the Store dashboard only counts payments
//      made after it
//
// It cannot delete anything at Mesh. Past sandbox transfers stay in Mesh's
// records; the Store dashboard simply stops showing the ones before the reset.

import fs from 'node:fs'
import path from 'node:path'

const dataDir = path.join(process.cwd(), '.data')
const port = process.env.PORT ?? '3000'

fs.rmSync(path.join(dataDir, 'orders.json'), { force: true })
console.log('✓ Order history deleted')

fs.mkdirSync(dataDir, { recursive: true })
fs.writeFileSync(
  path.join(dataDir, 'reset.json'),
  JSON.stringify({ resetAt: new Date().toISOString() }, null, 2),
)
console.log('✓ Store dashboard will count payments from now on')

try {
  await fetch(`http://localhost:${port}/api/connection`, { method: 'DELETE' })
  console.log('✓ Connected Coinbase account forgotten')
  await fetch(`http://localhost:${port}/api/activity`, { method: 'DELETE' })
  console.log('✓ Activity log cleared')
} catch {
  // The connection only lives in the running server's memory, so if the
  // server is not running there is nothing to forget.
  console.log(`✓ No dev server on port ${port}, so no connected account to forget`)
}

console.log('\nDone. Refresh the browser to start as a new user.')
