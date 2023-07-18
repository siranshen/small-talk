'use client'

import Chat from './components/chat/Chat'
import Sidebar from './components/sidebar/Sidebar'

export default function Home() {
  return (
    <div className='min-w-[350px] h-full flex'>
      <Sidebar />
      <Chat />
    </div>
  )
}
