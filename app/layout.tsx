import type { Metadata } from 'next'
import Link from 'next/link'
import { isMockMode } from '@/lib/mesh/client'
import './globals.css'

export const metadata: Metadata = { title: 'Mesh demo store' }

// Pages read env vars and the in-memory session, so render them per request.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {isMockMode() && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            Mock mode: Mesh responses and the Link popup are simulated. Set
            MESH_MOCK=false in .env.local to use the sandbox.
          </div>
        )}
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-4 text-sm font-medium">
            <Link href="/" className="text-base font-semibold">Mesh demo</Link>
            <Link href="/shop" className="text-slate-600 hover:text-slate-900">Shop</Link>
            <Link href="/portfolio" className="text-slate-600 hover:text-slate-900">Portfolio</Link>
            <Link href="/orders" className="text-slate-600 hover:text-slate-900">Orders</Link>
            <Link href="/store" className="text-slate-600 hover:text-slate-900">Store</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      </body>
    </html>
  )
}
