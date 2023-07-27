'use client'

import Chat from './components/chat/Chat'
import useLocaleLoader from '@/app/hooks/locale'

export default function Home() {
  useLocaleLoader()

  return <Chat />
}
