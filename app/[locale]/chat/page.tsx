'use client'

import { ChatLineGroup, LoadingChatLineGroup } from '@/app/components/chat/ChatLineGroup'
import ChatInput from './components/ChatInput'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage, PAUSE_TOKEN, serializeConvo } from '@/app/utils/chat-message'
import { SpeechRecognitionProcessor, SpeechSynthesisTaskProcessor } from '@/app/utils/azure-speech'
import { useTranslations } from 'next-intl'
import { LANGUAGES, LANGUAGES_MAP } from '@/app/utils/i18n'
import {
  CONVO_STORAGE_KEY,
  LEARNING_LANG_KEY,
  LEVEL_KEY,
  TOPIC_PROMPT_KEY,
  SELF_INTRO_KEY,
  VOICE_NAME_KEY,
  TOPIC_KEY,
} from '@/app/utils/local-keys'
import Toaster from '@/app/components/toast/Toaster'
import useToasts from '@/app/hooks/toast'
import useLocaleLoader from '@/app/hooks/locale'
import MicIcon from '@/public/icons/mic.svg'
import PlusIcon from '@/public/icons/plus.svg'

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
  const [topicTitle, setTopicTitle] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [convo, setConvo] = useConvo()
  const [started, setStarted] = useState<boolean>(false)

  const isAutoplayEnabled = useRef<boolean>(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const emptyAudioRef = useRef<HTMLAudioElement>(null)
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

  const resumeAudioIfNecessary = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
      audioContextRef.current.audioWorklet.addModule('/audio/mono-processor.js').then(() => setConfiguringAudio(false))
    }
    if (audioContextRef.current.state == 'suspended') {
      await audioContextRef.current.resume()
    }
  }, [])

  /* A workaround to unlock autoplay on Webkit browsers */
  const enableAudioAutoplay = useCallback(async () => {
    if (isAutoplayEnabled.current || !audioContextRef.current) {
      return
    }
    if (!isSafari()) {
      // Non-Webkit browsers don't need the rest
      return
    }
    await emptyAudioRef.current?.play()
    isAutoplayEnabled.current = true
  }, [isSafari])

  /* Run once */
  useEffect(() => {
    setTopicTitle(sessionStorage.getItem(TOPIC_KEY) ?? i18n('header.title'))
    const shouldShow = localStorage.getItem('shouldShowAiText')
    setShowText(shouldShow === null || shouldShow === 'true')
    setConfiguringAudio(true)
    audioContextRef.current = new AudioContext()
    audioContextRef.current.audioWorklet.addModule('/audio/mono-processor.js').then(() => setConfiguringAudio(false))
    return () => {
      audioContextRef.current?.close()
    }
  }, [i18n])

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
      const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_KEY) ?? LANGUAGES[0].locale]
      const voiceIndex = sessionStorage.getItem(VOICE_NAME_KEY) ?? '0'
      const voice = learningLanguage.voiceNames[parseInt(voiceIndex)]
      const userLevel = localStorage.getItem(LEVEL_KEY) ?? ''
      await resumeAudioIfNecessary()
      const ssProcessor = (speechSynthesisTaskProcessorRef.current = new SpeechSynthesisTaskProcessor(
        audioContextRef.current as AudioContext,
        SAMPLE_RATE,
        learningLanguage,
        voice,
        userLevel
      ))
      let response
      try {
        const llmCallPromise = fetch('/api/openai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newConvo.slice(-8).map((msg) => msg.toGPTMessage()), // TODO: Calculate tokens
            language: learningLanguage.name,
            level: userLevel,
            selfIntro: localStorage.getItem(SELF_INTRO_KEY) ?? '',
            speakerName: voice.name,
            topic: sessionStorage.getItem(TOPIC_PROMPT_KEY) ?? 'Undefined. Can be any random topic.',
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
    [addToast, i18nCommon, resumeAudioIfNecessary, setConvo]
  )

  const startChat = useCallback(async () => {
    enableAudioAutoplay()
    setStarted(true)
    await generateResponse([])
  }, [enableAudioAutoplay, generateResponse])

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
      await resumeAudioIfNecessary()
      if (!audioContextRef.current) {
        return
      }
      const audioContext = audioContextRef.current
      const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_KEY) ?? LANGUAGES[0].locale]
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
  }, [addToast, i18nCommon, isSafari, resumeAudioIfNecessary])

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
    <main className='animate-[fade-in_600ms] flex-1 h-full relative overflow-hidden' onClick={enableAudioAutoplay}>
      <Toaster toasts={toasts} removeToast={removeToast} />
      <header className='sticky top-0 left-0 w-full h-[2.5rem] border-b border-solid border-b-[--secondary-theme-color] lg:border-none flex items-center justify-around font-medium'>
        <div className='after:content-["💬"] after:ml-2'>{topicTitle ?? i18nCommon('loading')}</div>
      </header>
      <div className='my-0 mx-auto h-full overflow-scroll' ref={chatContainerRef}>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {started ? (
            <>
              {convo.map((msg) => (
                <ChatLineGroup key={msg.getId()} message={msg} shouldShowAiText={shouldShowAiText} />
              ))}
              {isTranscribing && <LoadingChatLineGroup isAi={false} />}
            </>
          ) : (
            <div className='rounded-lg border border-solid border-zinc-300 mb-6 px-5 py-4'>
              {i18n.rich('intro', {
                p: (paragraph) => <div className='mb-4 leading-6'>{paragraph}</div>,
                MicIcon: () => <MicIcon width={16} height={16} className='inline' />,
                PlusIcon: () => <PlusIcon width={16} height={16} className='inline' />,
              })}
              <button className='solid-button rounded-lg !px-4' onClick={startChat}>
                {i18n('startChat')}
              </button>
              <audio preload='auto' src='/audio/empty.wav' className='hidden' ref={emptyAudioRef} />
            </div>
          )}
          <div className='clear-both h-32'></div>
        </div>
        <ChatInput
          messageStates={{ started, isConfiguringAudio, isTranscribing, isStreaming, shouldShowAiText, isPlayingAudio }}
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
