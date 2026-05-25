import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Book Catalog | Каталог Книг',
  description: 'Откройте мир литературы - каталог книг с поиском и управлением',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 antialiased dark:from-amber-950 dark:via-orange-900 dark:to-red-950">
        {children}
      </body>
    </html>
  )
}
