import type { Metadata } from 'next'
import { Fraunces } from 'next/font/google'
import VersionChecker from '@/components/VersionChecker'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Classroom Check-In/Out Tracker',
  description: 'Classroom bathroom and hall pass tracker',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} min-h-screen text-gray-900 antialiased`}>
        <VersionChecker />
        {children}
      </body>
    </html>
  )
}
