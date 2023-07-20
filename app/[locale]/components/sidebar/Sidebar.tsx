'use client'

import GithubLogo from '@/public/icons/github-mark.svg'
import Logo from '@/public/icons/logo.svg'
import SettingsIcon from '@/public/icons/settings.svg'
import { useState } from 'react'
import SidebarToggleButton from './SidebarToggleButton'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import SidebarFunctionButton from './SidebarFunctionButton'
import SettingsModal from '../modal/SettingsModal'

export default function Sidebar() {
  const i18n = useTranslations('Sidebar')

  const [isOpen, setOpen] = useState<boolean>(false)
  const [isSettingsOpen, setSettingsOpen] = useState<boolean>(false)

  return (
    <>
      <SettingsModal isOpen={isSettingsOpen} setOpen={setSettingsOpen} />
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
        <div className='max-w-[300px] h-full relative z-20 bg-zinc-100 border-r border-solid border-r-zinc-200 flex flex-col overflow-visible'>
          <SidebarToggleButton open sidebarOpen={isOpen} setSidebarOpen={setOpen} />
          <SidebarToggleButton open={false} sidebarOpen={isOpen} setSidebarOpen={setOpen} />

          <div className='h-full p-4 flex flex-col overflow-auto'>
            <div className='text-2xl font-[800] my-4 mx-0 flex'>
              <div className='flex-[0_0_1.5rem] mr-3 flex items-center'>
                <Logo alt='logo' width={24} height={24} />
              </div>
              <span>SmallTalk</span>
            </div>

            <div className='flex-grow'>
              <div className='mb-4 leading-6'>{i18n('intro')}</div>
              <div className='mb-4 leading-6'>{i18n('notice')}</div>
              <div className='flex flex-col gap-2 my-6'>
                <SidebarFunctionButton text={i18n('functions.settings')} Icon={SettingsIcon} onClick={() => setSettingsOpen(true)} />
                <SidebarFunctionButton text={i18n('functions.newChat')} Icon={Logo} disabled onClick={() => {}}/>
              </div>
            </div>
            <footer className='border-t pt-4 text-sm'>
              <Link href='https://github.com/siranshen/small-talk' target='_blank' className='flex justify-center items-center'>
                <GithubLogo width={20} height={20} className='mr-2' />
                <span>{i18n('footer.github')}</span>
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </>
  )
}
