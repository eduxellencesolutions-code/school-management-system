import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Eduxellence Results',
    template: '%s | Eduxellence Results',
  },
  description: 'Smart academic assessment and result management platform for schools and educators.',
  keywords: ['school results', 'academic records', 'result management', 'education technology'],
  authors: [{ name: 'Eduxellence' }],
  manifest: '/manifest.json',
  themeColor: '#1C6EF2',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  icons: {
    icon: 'https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico',
    apple: 'https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico" />
        <link rel="apple-touch-icon" href="https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico" />
        <link rel="shortcut icon" href="https://raw.githubusercontent.com/jesylvesterboy-source/my-website/main/Eduxellence.ico" />
      </head>
      <body>
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
