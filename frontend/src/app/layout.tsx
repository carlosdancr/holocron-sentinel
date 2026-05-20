import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/query-provider'
import { Sidebar } from '@/components/layout/sidebar'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Holocron Sentinel',
  description: 'Sistema de monitoramento operacional — Alianca Rebelde',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <QueryProvider>
          <div className="grid h-screen grid-cols-[264px_1fr] overflow-hidden">
            <Sidebar />
            <main className="flex min-w-0 flex-col overflow-hidden">{children}</main>
          </div>
        </QueryProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
