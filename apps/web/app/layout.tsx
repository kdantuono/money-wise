import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MoneyWise - Personal Finance Management',
  description: 'AI-powered personal finance management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}