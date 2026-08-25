import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import AnnouncementTicker from '@/components/announcements/AnnouncementTicker'
import TawkWidget from '@/components/support/TawkWidget'
import '@/styles/globals.css'

// ✅ Google Fonts using Next.js built-in optimization
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// ✅ Comprehensive SEO Metadata configuration
export const metadata: Metadata = {
  metadataBase: new URL('https://results.eduxellence.org'),
  title: {
    default: 'Eduxellence Results | Smart Academic Assessment & Result Portal',
    template: '%s | Eduxellence Results',
  },
  description: 'Streamlined academic assessment, student grading, report card generation, and result management platform for primary, secondary, and tertiary institutions.',
  keywords: [
    'school result checker',
    'academic records portal',
    'report card generator',
    'result management system',
    'student grading software',
    'eduxellence results',
    'school management system'
  ],
  authors: [{ name: 'Eduxellence Solutions', url: 'https://results.eduxellence.org' }],
  creator: 'Eduxellence Solutions',
  publisher: 'Eduxellence Solutions',
  alternates: {
    canonical: 'https://results.eduxellence.org',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://results.eduxellence.org',
    title: 'Eduxellence Results | Smart Academic Assessment & Result Portal',
    description: 'Streamlined academic assessment, student grading, report card generation, and result management platform for modern schools.',
    siteName: 'Eduxellence Results',
    images: [
      {
        url: 'https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico',
        width: 512,
        height: 512,
        alt: 'Eduxellence Results Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Eduxellence Results | Smart Academic Assessment Portal',
    description: 'Automated student result processing, report card generation, and grade tracking.',
    images: ['https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: 'https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico',
    apple: 'https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico',
    shortcut: 'https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#1C6EF2',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="overflow-x-hidden w-full max-w-[100vw]">
        {/* ✅ Global Announcement Ticker */}
        <AnnouncementTicker />
        {/* ✅ Tawk.to live chat */}
        <TawkWidget />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0D1117',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '6px',
              padding: '10px 14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}