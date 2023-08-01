'use client'

import { ChatLineGroup, LoadingChatLineGroup } from '@/app/components/chat/ChatLineGroup'
import ChatInput from './components/ChatInput'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioChatMessage, CONVO_STORAGE_KEY, ChatMessage, PAUSE_TOKEN, serializeConvo } from '@/app/utils/chat-message'
import { SpeechRecognitionProcessor, SpeechSynthesisTaskProcessor } from '@/app/utils/azure-speech'
import { useTranslations } from 'next-intl'
import { LANGUAGES, LANGUAGES_MAP, LEARNING_LANG_FIELD } from '@/app/utils/i18n'
import Toast from '@/app/components/toast/Toast'
import useToasts from '@/app/hooks/toast'
import useLocaleLoader from '@/app/hooks/locale'

const SAMPLE_RATE = 24000

/* Custom hook that stores conversation history to session storage when Chat unmounts */
function useConvo() {
  const [convo, setConvo] = useState<ChatMessage[]>([])
  const convoRef = useRef<ChatMessage[]>([])
  convoRef.current = convo
  useEffect(() => {
    return () => {
      sessionStorage.setItem(CONVO_STORAGE_KEY, serializeConvo(convoRef.current))
    }
  }, [])
  return [convo, setConvo] as const
}

export default function Chat() {
  useLocaleLoader()
  const i18n = useTranslations('Chat')
  const i18nCommon = useTranslations('Common')
  const [toasts, addToast, removeToast] = useToasts()

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [convo, setConvo] = useConvo()

  const isAutoplayEnabled = useRef<boolean>(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const speechRecognitionProcessorRef = useRef<SpeechRecognitionProcessor | null>(null)
  const speechSynthesisTaskProcessorRef = useRef<SpeechSynthesisTaskProcessor | null>(null)
  const [isConfiguringAudio, setConfiguringAudio] = useState<boolean>(false)
  const [isTranscribing, setTranscribing] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)
  const [isPlayingAudio, setPlayingAudio] = useState<boolean>(false)
  const [shouldShowAiText, setShowText] = useState<boolean>(true)

  const isSafari = useCallback(() => {
    return navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1
  }, [])

  /* A workaround to unlock autoplay on Webkit browsers */
  const enableAudioAutoplay = useCallback(async () => {
    if (isAutoplayEnabled.current || !audioContextRef.current) {
      return
    }
    const audioContext = audioContextRef.current
    if (audioContext.state == 'suspended') {
      audioContext.resume()
    }
    if (!isSafari()) {
      // Non-Webkit browsers don't need the rest
      return
    }
    const dummyBuffer = audioContext.createBuffer(1, 1, 22050)
    const source = audioContext.createBufferSource()
    source.buffer = dummyBuffer
    source.loop = true
    source.connect(audioContext.destination)
    source.start()
    isAutoplayEnabled.current = true
  }, [isSafari])

  useEffect(() => {
    const shouldShow = localStorage.getItem('shouldShowAiText')
    setShowText(shouldShow === null || shouldShow === 'true')
    setConfiguringAudio(true)
    audioContextRef.current = new AudioContext()
    audioContextRef.current.audioWorklet.addModule('/audio/mono-processor.js').then(() => setConfiguringAudio(false))
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('shouldShowAiText', shouldShowAiText ? 'true' : 'false')
  }, [shouldShowAiText])

  /* Scroll to bottom upon new message */
  useEffect(() => {
    if (!chatContainerRef.current) {
      return
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [convo, isTranscribing])

  /* Request LLM to generate response and then synthesize voice */
  const generateResponse = useCallback(
    async (newConvo: ChatMessage[]) => {
      setStreaming(true)
      setConvo([...newConvo, new ChatMessage('', true, true)])
      const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale]
      const ssProcessor = (speechSynthesisTaskProcessorRef.current = new SpeechSynthesisTaskProcessor(
        audioContextRef.current as AudioContext,
        SAMPLE_RATE,
        learningLanguage
      ))
      let response
      try {
        const llmCallPromise = fetch('/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newConvo.slice(-8).map((msg) => msg.toGPTMessage()),
            language: learningLanguage.name,
            speakerName: learningLanguage.voiceNames[0].name, // TODO customize
          }),
        })
        const ssProcessorInitPromise = ssProcessor.init()
        ;[response] = await Promise.all([llmCallPromise, ssProcessorInitPromise])

        if (!response.ok) {
          throw new Error(response.statusText)
        }
        if (!response.body) {
          throw new Error('No response returned!')
        }
      } catch (e) {
        addToast(i18nCommon('error'))
        console.error('Error generating response', e)
        setStreaming(false)
        setConvo([...newConvo]) // Remove the loading message
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let lastMessage = '',
        lastPauseIndex = 0
      try {
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          const chunkValue = decoder.decode(value)
          lastMessage += chunkValue
          const pauseIndex = lastMessage.lastIndexOf(PAUSE_TOKEN)
          if (pauseIndex > lastPauseIndex) {
            ssProcessor.pushTask({ text: lastMessage.substring(lastPauseIndex, pauseIndex) })
            lastPauseIndex = pauseIndex + PAUSE_TOKEN.length
          }
          setConvo([...newConvo, new ChatMessage(lastMessage, true, true)])
        }
        ssProcessor.pushTask({ text: lastMessage.substring(lastPauseIndex) })
        setStreaming(false)
        setPlayingAudio(true)
        const audioBlob = await ssProcessor.exportAudio()
        const newAudioMessage = new AudioChatMessage(lastMessage, true, audioBlob)
        await newAudioMessage.loadAudioMetadata()
        setConvo([...newConvo, newAudioMessage])
      } catch (e) {
        addToast(i18nCommon('error'))
        console.error('Error while reading LLM response', e)
      }
      ssProcessor.releaseResources()
      ssProcessor.complete()
      setStreaming(false)
      setPlayingAudio(false)
    },
    [addToast, i18nCommon, setConvo]
  )

  const stopAudio = useCallback(async () => {
    await speechSynthesisTaskProcessorRef.current?.stop()
    setPlayingAudio(false)
  }, [])

  /* Send user text message */
  const sendText = useCallback(
    async (message: string) => {
      const newMessage = new ChatMessage(message, false)
      const newConvo = [...convo, newMessage]
      setConvo(newConvo)
      await generateResponse(newConvo)
    },
    [convo, generateResponse, setConvo]
  )

  const startRecording = useCallback(async () => {
    setConfiguringAudio(true)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
        await audioContextRef.current.audioWorklet.addModule('/audio/mono-processor.js')
      }
      const audioContext = audioContextRef.current
      if (audioContext.state == 'suspended') {
        audioContext.resume()
      }
      const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale]
      speechRecognitionProcessorRef.current = new SpeechRecognitionProcessor(
        audioContext,
        audioStream,
        learningLanguage,
        isSafari()
      )
    } catch (e) {
      addToast(i18nCommon('error'))
      console.error('Error initializing audio', e)
      setConfiguringAudio(false)
      return
    }
    const srProcessor = speechRecognitionProcessorRef.current

    try {
      await srProcessor.init()
      setConfiguringAudio(false)
      setTranscribing(true)
      await srProcessor.start()
    } catch (e) {
      srProcessor.releaseResources()
      addToast(i18nCommon('error'))
      console.error('Error starting speech recognition', e)
      setConfiguringAudio(false)
      setTranscribing(false)
    }
  }, [addToast, i18nCommon, isSafari])

  const stopRecording = useCallback(async () => {
    if (!speechRecognitionProcessorRef.current) {
      return
    }
    setConfiguringAudio(true)
    let lastMessage = ''
    try {
      lastMessage = await speechRecognitionProcessorRef.current.stopAndGetResult()
    } catch (e) {
      addToast(i18nCommon('error'))
      console.error('Error stopping recognition', e)
      speechRecognitionProcessorRef.current?.releaseResources()
      setConfiguringAudio(false)
      return
    }
    const audioBlob = speechRecognitionProcessorRef.current.exportAudio()
    speechRecognitionProcessorRef.current?.releaseResources()
    setTranscribing(false)
    setConfiguringAudio(false)

    if (lastMessage.trim()) {
      const newAudioMessage = new AudioChatMessage(lastMessage, false, audioBlob)
      await newAudioMessage.loadAudioMetadata()
      const newConvo = [...convo, newAudioMessage]
      setConvo(newConvo)
      await generateResponse(newConvo)
    }
  }, [addToast, i18nCommon, convo, setConvo, generateResponse])

  return (
    /* overflow-hidden prevents sticky div from jumping */
    <main className='flex-1 h-full relative overflow-hidden' onClick={enableAudioAutoplay}>
      {toasts.map((toast) => (
        <Toast key={toast.id} id={toast.id} message={toast.message} duration={toast.duration} removeToast={removeToast} />
      ))}
      <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
        <div className='after:content-["_💬"]'>{i18n('header.title')}</div>
      </header>
      <div className='my-0 mx-auto h-full overflow-scroll' ref={chatContainerRef}>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {convo.map((msg) => (
            <ChatLineGroup key={msg.getId()} message={msg} shouldShowAiText={shouldShowAiText} />
          ))}
          {isTranscribing && <LoadingChatLineGroup isAi={false} />}
          <div className='clear-both h-32'></div>
        </div>
        <ChatInput
          messageStates={{ isConfiguringAudio, isTranscribing, isStreaming, shouldShowAiText, isPlayingAudio }}
          stopAudio={stopAudio}
          startRecording={startRecording}
          stopRecording={stopRecording}
          sendTextMessage={sendText}
          setShowText={setShowText}
        />
      </div>
    </main>
  )
}
