import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Classroom Check-In/Out Tracker',
  description: 'Classroom bathroom and hall pass tracker',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
