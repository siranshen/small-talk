'use client'

import { useLocale } from 'next-intl'
import Chat from './components/chat/Chat'
import Sidebar from './components/sidebar/Sidebar'
import { usePathname, useRouter } from 'next-intl/client'
import { SYSTEM_LANG_FIELD } from '../utils/i18n'
import { useEffect } from 'react'

export default function Home() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    const localLocale = localStorage.getItem(SYSTEM_LANG_FIELD)
    if (localLocale && localLocale !== locale) {
      router.replace(pathname, { locale: localLocale })
    }
  }, [locale, pathname, router])

  return (
    <div className='min-w-[350px] h-full flex'>
      <Sidebar />
      <Chat />
    </div>
  )
}
