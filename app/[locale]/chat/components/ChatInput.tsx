import DocsIcon from '@/public/icons/docs.svg'
import MicIcon from '@/public/icons/mic.svg'
import MicLoading from '@/public/icons/mic-loading.svg'
import MicStopIcon from '@/public/icons/mic-stop.svg'
import PlusIcon from '@/public/icons/plus.svg'
import ReviewIcon from '@/public/icons/review.svg'
import { MouseEventHandler, useEffect, useRef, useState } from 'react'
import styles from '@/app/components/chat/Chat.module.css'
import { MessageStates } from '@/app/utils/chat-message'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next-intl/client'

function TooltipItem({ icon, text, onClick }: { icon: JSX.Element; text: string; onClick: MouseEventHandler }) {
  return (
    <button
      className='border-none rounded-md bg-white px-2 py-1 text-left text-sm text-inherit whitespace-nowrap flex items-center hover:bg-gray-100'
      onClick={onClick}
    >
      <span className='h-4 mr-2'>{icon}</span>
      {text}
    </button>
  )
}

export default function ChatInput({
  messageStates,
  stopAudio,
  startRecording,
  stopRecording,
  sendTextMessage,
  setShowText,
}: {
  messageStates: MessageStates
  stopAudio: Function
  startRecording: Function
  stopRecording: Function
  sendTextMessage: Function
  setShowText: Function
}) {
  const i18n = useTranslations('Chat')
  const router = useRouter()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState<string>('')
  const [isTooltipOpen, setTooltipOpen] = useState<boolean>(false)

  /* Run once */
  useEffect(() => {
    router.prefetch('/review')
  }, [router])

  useEffect(() => {
    if (!textareaRef || !textareaRef.current) {
      return
    }
    textareaRef.current.style.height = '1px'
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (
        !input ||
        !messageStates.started ||
        messageStates.isStreaming ||
        messageStates.isConfiguringAudio ||
        messageStates.isTranscribing ||
        messageStates.isPlayingAudio
      ) {
        return
      }
      sendTextMessage(input)
      setInput('')
    }
  }

  return (
    <div
      className={`${styles['gradient-to-top']} absolute bottom-0 bg-white border-t border-solid border-t-zinc-200 w-full p-4 md:border-none md:w-[calc(100%-32px)] md:my-0 md:mx-4 md:pt-8 md:px-4 md:pb-6`}
    >
      <div className='relative max-w-[650px] my-0 mx-auto bg-white border border-solid border-zinc-200 rounded-[2rem] p-5 shadow-[0_0_10px_rgba(0,0,0,.1)] hover:shadow-[0_0_10px_rgba(0,0,0,.15)] flex items-stretch'>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={i18n('input.placeholder')}
          className='flex-1 border-none resize-none leading-5 min-h-[1.25em] max-h-24 mr-[4.75rem] focus:outline-0'
          onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          value={input}
        ></textarea>
        <div className='absolute flex right-[calc(0.85rem+1px)] bottom-[calc(0.8rem+1px)]'>
          <button
            id='mic-btn'
            disabled={!messageStates.started || messageStates.isStreaming || messageStates.isConfiguringAudio}
            onClick={() =>
              messageStates.isPlayingAudio ? stopAudio() : messageStates.isTranscribing ? stopRecording() : startRecording()
            }
            className={`${
              messageStates.isTranscribing ? 'animate-pulse !bg-red-600' : ''
            } solid-button rounded-full relative mr-2`}
          >
            {messageStates.isConfiguringAudio ? (
              <MicLoading width={16} height={16} alt='loading' />
            ) : messageStates.isTranscribing || messageStates.isPlayingAudio ? (
              <MicStopIcon width={16} height={16} alt='stop' />
            ) : (
              <MicIcon width={16} height={16} alt='mic' />
            )}
          </button>
          <button
            id='options-btn'
            className={`${isTooltipOpen ? 'rotate-45' : ''} solid-button rounded-full transition-transform duration-300`}
            onClick={() => setTooltipOpen(!isTooltipOpen)}
          >
            <PlusIcon width={16} height={16} alt='options' />
          </button>
          <div
            id='options-tooltip'
            className={`${
              isTooltipOpen ? '' : 'opacity-0 scale-0'
            } absolute bottom-[100%] right-4 z-30 mb-2 rounded-lg rounded-br-none bg-white border border-solid border-zinc-200 shadow-[0_0_10px_rgba(0,0,0,.1)] hover:shadow-[0_0_10px_rgba(0,0,0,.15)] min-w-[160px] flex flex-col p-2 origin-bottom-right transition-all duration-300`}
          >
            <TooltipItem
              icon={<DocsIcon width={16} height={16} alt='' />}
              text={
                messageStates.shouldShowAiText ? i18n('controls.toggleTextShow.hide') : i18n('controls.toggleTextShow.show')
              }
              onClick={() => setShowText(!messageStates.shouldShowAiText)}
            />
            <TooltipItem
              icon={<ReviewIcon width={16} height={16} alt='' />}
              text={i18n('controls.review')}
              onClick={() => router.push('/review')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
