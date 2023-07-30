import SendIcon from '@/public/icons/send.svg'
import { useEffect, useRef, useState } from 'react'
import styles from '@/app/components/chat/Chat.module.css'
import { useTranslations } from 'next-intl'

export default function QAInput({ isStreaming, sendMessage }: { isStreaming: boolean; sendMessage: Function }) {
  const i18n = useTranslations('Chat')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState<string>('')

  function send() {
    if (!input || isStreaming) {
      return
    }
    sendMessage(input)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  useEffect(() => {
    if (!textareaRef || !textareaRef.current) {
      return
    }
    textareaRef.current.style.height = '1px'
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
  }, [input])

  return (
    <div
      className={`${styles['gradient-to-top']} absolute bottom-0 bg-white border-t border-solid border-t-zinc-200 w-full p-4 md:border-none md:w-[calc(100%-32px)] md:my-0 md:mx-4 md:pt-8 md:px-4 md:pb-6`}
    >
      <div className='relative max-w-[650px] my-0 mx-auto bg-white border border-solid border-zinc-200 rounded-[2rem] p-5 shadow-[0_0_10px_rgba(0,0,0,.1)] hover:shadow-[0_0_10px_rgba(0,0,0,.15)] flex items-stretch'>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={i18n('input.placeholder')}
          className='flex-1 border-none resize-none leading-5 min-h-[1.25em] max-h-24 mr-[2.75rem] focus:outline-0'
          onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          value={input}
        ></textarea>
        <div className='absolute flex right-[calc(0.85rem+1px)] bottom-[calc(0.8rem+1px)]'>
          <button id='send-btn' disabled={isStreaming} onClick={send} className='solid-button rounded-full relative'>
            <SendIcon width={16} height={16} alt='send' />
          </button>
        </div>
      </div>
    </div>
  )
}
