'use client'

import useLocaleLoader from '@/app/hooks/locale'

export default function Home() {
  useLocaleLoader()

  return (
    <main className='flex-1 h-full relative overflow-hidden'>
      <div className='my-0 mx-auto h-full overflow-scroll'>
        <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
          <div className='after:content-["_💬"]'>New Chat</div>
        </header>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          <div>Select a scenario from below and start talking!</div>
          <div className='flex flex-col'>
            <div className=''>Free talk</div>
          </div>
        </div>
      </div>
    </main>
  )
}
