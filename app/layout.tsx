import type { Metadata, Viewport } from 'next'
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
  title: 'Smart Hall Pass',
  description: 'Classroom check-in / hall pass tracker',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Smart Hall Pass', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#5b21b6',
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
