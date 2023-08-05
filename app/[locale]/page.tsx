'use client'

import useLocaleLoader from '@/app/hooks/locale'
import NewChatModal from './components/modal/NewChatModal'
import { useState } from 'react'

function ScenarioButton({ icon, text, onClick }: { icon: string; text: string; onClick: () => void }) {
  return (
    <button className='solid-button-light rounded-lg !px-4 !py-3 relative text-left flex items-center' onClick={onClick}>
      <div
        before-content={icon}
        className='before:absolute before:top-1/2 before:-translate-y-1/2 before:content-[attr(before-content)] mr-7'
      />
      <div>{text}</div>
    </button>
  )
}

export default function Home() {
  useLocaleLoader()

  const [isModalOpen, setModalOpen] = useState<boolean>(false)
  const [isCustomizable, setCustomizable] = useState<boolean>(false)

  return (
    <>
      <NewChatModal isCustomizable={isCustomizable} isOpen={isModalOpen} setOpen={setModalOpen} />
      <main className='flex-1 h-full relative overflow-hidden'>
        <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
          <div className='after:content-["💬"] after:ml-2'>New Chat</div>
        </header>
        <div className='my-0 mx-auto h-full overflow-scroll'>
          <div className='max-w-[650px] my-0 mx-auto p-3'>
            <div className='mb-4 leading-6'>You can start a free talk if you already have a topic in mind.</div>
            <div className='mb-4 leading-6 grid grid-cols-2 gap-2 sm:gap-3'>
              <ScenarioButton
                icon='🗣️'
                text='Customize your topic'
                onClick={() => {
                  setModalOpen(true)
                  setCustomizable(true)
                }}
              />
            </div>
            <div className='mb-4 leading-6'>Or you can select a scenario from below and start practicing!</div>
            <div className='pb-14 leading-6 grid grid-cols-2 gap-2 sm:gap-3'>
              <ScenarioButton
                icon='🎬'
                text='Favorite movies'
                onClick={() => {
                  setModalOpen(true)
                  setCustomizable(false)
                }}
              />
              <ScenarioButton icon='🎵' text='Favorite music' onClick={() => {}} />
              <ScenarioButton icon='🎮' text='Favorite games' onClick={() => {}} />
              <ScenarioButton icon='⚽' text='Favorite sports' onClick={() => {}} />
              <ScenarioButton icon='🍔' text='Cuisines around the world' onClick={() => {}} />
              <ScenarioButton icon='🥗' text='Healthy food' onClick={() => {}} />
              <ScenarioButton icon='🏖️' text='My best vacation' onClick={() => {}} />
              <ScenarioButton icon='🛩' text='Plan my next trip' onClick={() => {}} />
              <ScenarioButton icon='😬' text='My best friend' onClick={() => {}} />
              <ScenarioButton icon='👪' text='My parents' onClick={() => {}} />
              <ScenarioButton icon='👸' text='Celebrities' onClick={() => {}} />
              <ScenarioButton icon='🏠' text='My hometown' onClick={() => {}} />
              <ScenarioButton icon='🎓' text='College life' onClick={() => {}} />
              <ScenarioButton icon='📈' text='Career goal' onClick={() => {}} />
              <ScenarioButton icon='🤠' text='Cultural differences' onClick={() => {}} />
              <ScenarioButton icon='🤖' text='Is AI taking over?' onClick={() => {}} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
