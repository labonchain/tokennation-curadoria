import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Curadoria NFT Brasil 2026',
  description: 'Plataforma de curadoria de obras para NFT Brasil 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
