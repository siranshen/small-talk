'use client'

import useLocaleLoader from '@/app/hooks/locale'
import NewChatModal from './components/modal/NewChatModal'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

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
  const i18n = useTranslations('NewChat')

  const [isModalOpen, setModalOpen] = useState<boolean>(false)
  const [topic, setTopic] = useState<string | null>(null)

  return (
    <>
      <NewChatModal isOpen={isModalOpen} setOpen={setModalOpen} topic={topic} />
      <main className='animate-[fade-in_600ms] flex-1 h-full relative overflow-hidden'>
        <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
          <div className='after:content-["💬"] after:ml-2'>{i18n('header.title')}</div>
        </header>
        <div className='my-0 mx-auto h-full overflow-scroll'>
          <div className='max-w-[650px] my-0 mx-auto p-3'>
            <div className='mb-4 leading-6'>{i18n('intro.freetalk')}</div>
            <div className='mb-4 leading-6 grid grid-cols-2 gap-2 sm:gap-3'>
              <ScenarioButton
                icon={i18n('scenarios.customize.icon')}
                text={i18n('scenarios.customize.text')}
                onClick={() => {
                  setModalOpen(true)
                  setTopic(null)
                }}
              />
            </div>
            <div className='mb-4 leading-6'>{i18n('intro.preset')}</div>
            <div className='pb-14 leading-6 grid grid-cols-2 gap-2 sm:gap-3'>
              {Array.from(Array(16).keys()).map((i) => (
                <ScenarioButton
                  key={i}
                  icon={i18n(`scenarios.${i}.icon`)}
                  text={i18n(`scenarios.${i}.text`)}
                  onClick={() => {
                    setModalOpen(true)
                    setTopic(i18n(`scenarios.${i}.text`))
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
