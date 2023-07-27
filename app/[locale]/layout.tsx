import './globals.css'
import { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'
import { LANGUAGES } from '../utils/i18n'
import Sidebar from './components/sidebar/Sidebar'

export const metadata: Metadata = {
  title: 'SmallTalk',
}

export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ locale: lang.locale }))
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  let messages
  try {
    messages = (await import(`@/messages/${locale}.json`)).default
  } catch (error) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className='min-w-[350px] h-full flex'>
            <Sidebar />
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
