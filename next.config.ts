import type { NextConfig } from 'next'

const config: NextConfig = {
  logging: {
    // The Activity page reports to and polls /api/activity constantly. Keep
    // those lines out of the terminal so the Mesh calls are easy to read.
    incomingRequests: { ignore: [/^\/api\/activity/] },
  },
}

export default config
