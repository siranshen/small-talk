'use client'

import Chat from './components/Chat/Chat'
import Sidebar from './components/Sidebar/Sidebar'

export default function Home() {
  return (
    <div className='min-w-[350px] h-full flex'>
      <Sidebar />
      <Chat />
    </div>
  )
}
