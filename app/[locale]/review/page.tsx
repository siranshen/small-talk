'use client'

import useLocaleLoader from '@/app/hooks/locale'
import { useEffect, useState } from 'react'

export default function Review() {
  useLocaleLoader()

  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: fetch real data
    setTimeout(() => setLoading(false), 2000)
  }, [])

  return (
    <main className='flex-1 h-full relative overflow-hidden'>
      <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
        <div className='after:content-["_📃"]'>Review</div>
      </header>
      <div className='my-0 mx-auto h-full overflow-scroll'>
        <div className='h-full'>
          <div className='max-w-[650px] my-0 mx-auto p-3'>
            {isLoading ? <div>Loading...</div> : <div>Still working on it...</div>}
            <div className='clear-both h-32'></div>
          </div>
        </div>
      </div>
    </main>
  )
}
