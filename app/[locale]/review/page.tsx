'use client'

import useLocaleLoader from '@/app/hooks/locale'
import EvaluationCard, { StorageData } from './components/EvaluationCard'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CONVO_STORAGE_KEY, ChatMessage } from '@/app/utils/chat-message'
import { LANGUAGES, LANGUAGES_MAP, LEARNING_LANG_FIELD, SYSTEM_LANG_FIELD } from '@/app/utils/i18n'
import { ChatLineGroup, LoadingChatLineGroup } from '@/app/components/chat/ChatLineGroup'
import QAInput from './components/QAInput'
import useToasts from '@/app/hooks/toast'
import { useTranslations } from 'next-intl'
import Toast from '@/app/components/toast/Toast'
import Loading from './components/Loading'

function useStorageData(): StorageData | null {
  const [data, setData] = useState<StorageData | null>(null)
  useEffect(() => {
    const convo = sessionStorage.getItem(CONVO_STORAGE_KEY)
    const learningLang = localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale
    const systemLang = localStorage.getItem(SYSTEM_LANG_FIELD) ?? LANGUAGES[0].locale
    setData({ convo, learningLang, systemLang })
  }, [])
  return data
}

export default function Review() {
  useLocaleLoader()

  const i18n = useTranslations('Review')
  const i18nCommon = useTranslations('Common')
  const [toasts, addToast, removeToast] = useToasts()

  const storageData = useStorageData()
  const evaluationRef = useRef<string>('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [evaluationLoaded, setEvaluationLoaded] = useState<boolean>(false)
  const [convo, setConvo] = useState<ChatMessage[]>([new ChatMessage(i18n('qa'), true)])
  const [isLoadingMessage, setLoadingMessage] = useState<boolean>(false)

  /* Scroll to bottom upon new message */
  useEffect(() => {
    if (!chatContainerRef.current) {
      return
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [convo])

  const sendText = useCallback(
    async (message: string) => {
      const newMessage = new ChatMessage(message, false)
      const newConvo = [...convo, newMessage]
      setLoadingMessage(true)
      setConvo([...newConvo])
      const systemLanguage = LANGUAGES_MAP[localStorage.getItem(SYSTEM_LANG_FIELD) ?? LANGUAGES[0].locale]
      const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale]
      let response
      try {
        response = await fetch('/api/openai/review/qa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            evaluation: evaluationRef.current,
            messages: newConvo.slice(-8).map((msg) => msg.toGPTMessage(true)),
            language: systemLanguage.name,
            evalLanguage: learningLanguage.name,
          }),
        })
        if (!response.ok) {
          throw new Error(response.statusText)
        }
        if (!response.body) {
          throw new Error('No response returned!')
        }
      } catch (e) {
        addToast(i18nCommon('error'))
        console.error('Error generating response', e)
        setLoadingMessage(false)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let lastMessage = ''
      try {
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          const chunkValue = decoder.decode(value)
          lastMessage += chunkValue
          setLoadingMessage(false)
          setConvo([...newConvo, new ChatMessage(lastMessage, true)])
        }
      } catch (e) {
        addToast(i18nCommon('error'))
        console.error('Error while reading LLM response', e)
      }
      setLoadingMessage(false)
    },
    [addToast, convo, i18nCommon]
  )

  return (
    <main className='flex-1 h-full relative overflow-hidden'>
      {toasts.map((toast) => (
        <Toast key={toast.id} id={toast.id} message={toast.message} duration={toast.duration} removeToast={removeToast} />
      ))}
      <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
        <div className='after:content-["_📃"]'>{i18n('header.title')}</div>
      </header>
      <div className='my-0 mx-auto h-full overflow-scroll' ref={chatContainerRef}>
        {!storageData ||
          (!evaluationLoaded && (
            <div className='h-full'>
              <div className='max-w-[650px] my-10 mx-auto p-3'>
                <Loading />
              </div>
            </div>
          ))}
        {storageData && (
          <div className={`${evaluationLoaded ? '' : 'hidden'} h-full`}>
            <div className='max-w-[650px] my-0 mx-auto p-3'>
              <EvaluationCard storageData={storageData} evaluationRef={evaluationRef} setLoaded={setEvaluationLoaded} />
              {convo.map((msg) => (
                <ChatLineGroup key={msg.getId()} message={msg} shouldShowAiText />
              ))}
              {isLoadingMessage && <LoadingChatLineGroup isAi />}
              <div className='clear-both h-32'></div>
            </div>
            <QAInput isStreaming={isLoadingMessage} sendMessage={sendText} />
          </div>
        )}
      </div>
    </main>
  )
}
