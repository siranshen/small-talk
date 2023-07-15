'use client'

import GithubLogo from '@/public/icons/github-mark.svg'
import Logo from '@/public/icons/logo.svg'
import { useState } from 'react'
import SidebarToggleButton from './SidebarToggleButton'
import SidebarLabeledInput from './SidebarLabeledInput'
import Link from 'next/link'

export default function Sidebar() {
  const [isOpen, setOpen] = useState<boolean>(false)
  return (
    <>
      <div
        className={`${
          isOpen ? 'opacity-30 h-full [transition:opacity_300ms]' : 'opacity-0 h-0 [transition:opacity_300ms,height_1ms_300ms]'
        } bg-black fixed lg:hidden inset-0 z-10`}
        onClick={() => setOpen(false)}
      ></div>
      <div
        className={`${
          isOpen ? 'translate-x-0' : 'translate-x-[-100%]'
        } lg:translate-x-0 transition-transform duration-300 flex-[0_1_300px] h-full fixed top-0 left-0 z-10 lg:static lg:flex`}
      >
        <div className='max-w-[300px] h-full relative z-20 bg-zinc-100 border-r border-solid border-r-zinc-200 p-4 flex flex-col overflow-x-visible'>
          <SidebarToggleButton open sidebarOpen={isOpen} setSidebarOpen={setOpen} />
          <SidebarToggleButton open={false} sidebarOpen={isOpen} setSidebarOpen={setOpen} />

          <div className='text-2xl font-[800] my-4 mx-0 flex'>
            <div className='flex-[0_0_1.5rem] mr-3 flex items-center'>
              <Logo alt='logo' />
            </div>
            <span>SmallTalk</span>
          </div>

          <div className='flex-grow'>
            <div className='mb-4 leading-6'>
              Welcome to SmallTalk (TBD 😅)! This is where you get to practice your foreign or second language skills with an
              AI.
            </div>
            <div className='mb-4 leading-6'>This project is still being actively worked on. Stay tuned!</div>
            <div className='mb-4 leading-6'>
              <span className='font-[600]'>Upcoming</span>: I18n support so you can learn any of your fav language.
            </div>
          </div>
          <footer className='border-t pt-4 text-sm'>
            <Link href='https://github.com/siranshen/small-talk' target='_blank' className='flex justify-center items-center'>
              <GithubLogo width={20} height={20} className='mr-2' />
              <span>Check it out on Github!</span>
            </Link>
          </footer>
        </div>
      </div>
    </>
  )
}
