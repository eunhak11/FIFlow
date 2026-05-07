import type { Metadata, Viewport } from 'next'
import { Urbanist } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'

const urbanist = Urbanist({ subsets: ['latin'], variable: '--font-urbanist', weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'FIFlow',
  description: '외국인 투자 동향 분석',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FIFlow',
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${urbanist.variable} h-full`}>
      <body className="h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
