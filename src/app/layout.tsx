import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Classraum - Academy Management Platform',
  description: 'A comprehensive academy management platform for teachers, students, and parents.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <CommandPaletteProvider>
            {children}
          </CommandPaletteProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}