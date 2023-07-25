'use client'

import { ChatLineGroup, LoadingChatLineGroup } from './ChatLineGroup'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage, PAUSE_TOKEN } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'
import { SpeechSynthesisTaskProcessor, getSpeechConfig, startRecognition, stopRecognition } from '@/app/utils/azure-speech'
import { exportAudioInWav } from '@/app/utils/audio'
import {
  AudioConfig,
  AudioInputStream,
  AudioStreamFormat,
  CancellationDetails,
  PushAudioInputStream,
  ResultReason,
  SpeechRecognizer,
  SpeechSynthesisOutputFormat,
  SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk'
import { useTranslations } from 'next-intl'
import { LANGUAGES, LANGUAGES_MAP, LEARNING_LANG_FIELD } from '@/app/utils/i18n'
import { Toast, useToasts } from '../toast/Toast'

const SAMPLE_RATE = 24000

export default function Chat() {
  const i18n = useTranslations('Chat')
  const i18nCommon = useTranslations('Common')

  const [toasts, addToast, removeToast] = useToasts()

  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])

  const isAudioAutoplaying = useRef<boolean>(false)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorNodeRef = useRef<AudioWorkletNode | null>(null)
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null)
  const speechSynthesizerRef = useRef<SpeechSynthesizer | null>(null)
  const pushAudioInputStreamRef = useRef<PushAudioInputStream | null>(null)
  const audioBuffersRef = useRef<Int16Array[][]>([])
  const lastMessageRef = useRef<string>('')
  const [isConfiguringAudio, setConfiguringAudio] = useState<boolean>(false)
  const [isTranscribing, setTranscribing] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)
  const [shouldShowAiText, setShowText] = useState<boolean>(true)

  const isSafari = useCallback(() => {
    return navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1
  }, [])

  /* A workaround to unlock autoplay on Webkit browsers */
  const enableAudioAutoplay = useCallback(async () => {
    if (isAudioAutoplaying.current || !audioContextRef.current) {
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
    isAudioAutoplaying.current = true
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

  useEffect(() => {
    if (!chatContainerRef.current) {
      return
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [history, isTranscribing])

  const releaseInputAudioResources = useCallback(async () => {
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null
    pushAudioInputStreamRef.current?.close()
    pushAudioInputStreamRef.current = null
    speechRecognizerRef.current?.close()
    speechRecognizerRef.current = null
    audioBuffersRef.current = []
  }, [])

  const releaseOutputAudioResources = useCallback(async () => {
    speechSynthesizerRef.current?.close()
    speechSynthesizerRef.current = null
  }, [])

  /* Request LLM to generate response and then synthesize voice */
  const generateResponse = useCallback(
    async (newHistory: ChatMessage[]) => {
      setStreaming(true)
      setHistory([...newHistory, new ChatMessage('', true, true)])
      const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale]
      let response, speechConfig
      try {
        const llmCallPromise = fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newHistory.slice(-8).map((msg) => msg.toGPTMessage()),
            language: learningLanguage.name,
            speakerName: learningLanguage.voiceNames[0].name, // TODO customize
          }),
        })
        const speechConfigPromise = getSpeechConfig()
        ;[response, speechConfig] = await Promise.all([llmCallPromise, speechConfigPromise])

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
        setHistory([...newHistory]) // Remove the loading message
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let lastMessage = '',
        lastPauseIndex = 0
      speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Raw24Khz16BitMonoPcm
      const speechSynthesizer = (speechSynthesizerRef.current = new SpeechSynthesizer(
        speechConfig,
        null as unknown as AudioConfig
      ))
      const speechSynthesisTaskProcessor = new SpeechSynthesisTaskProcessor(
        audioContextRef.current as AudioContext,
        speechSynthesizer,
        SAMPLE_RATE,
        learningLanguage
      )
      speechSynthesisTaskProcessor.start()
      try {
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          const chunkValue = decoder.decode(value)
          lastMessage += chunkValue
          const pauseIndex = lastMessage.lastIndexOf(PAUSE_TOKEN)
          if (pauseIndex > lastPauseIndex) {
            speechSynthesisTaskProcessor.pushTask({ text: lastMessage.substring(lastPauseIndex, pauseIndex) })
            lastPauseIndex = pauseIndex + PAUSE_TOKEN.length
          }
          setHistory([...newHistory, new ChatMessage(lastMessage, true, true)])
        }
        speechSynthesisTaskProcessor.pushTask({ text: lastMessage.substring(lastPauseIndex) })
        const audioBlob = await speechSynthesisTaskProcessor.finish()
        const newAudioMessage = new AudioChatMessage(lastMessage, true, audioBlob)
        await newAudioMessage.loadAudioMetadata()
        setHistory([...newHistory, newAudioMessage])
      } catch (e) {
        addToast(i18nCommon('error'))
        console.error('Error while reading LLM response', e)
      }
      await releaseOutputAudioResources()
      setStreaming(false)
    },
    [addToast, i18nCommon, releaseOutputAudioResources]
  )

  /* Send user text message */
  const sendText = useCallback(
    async (message: string) => {
      const newMessage = new ChatMessage(message, false)
      const newHistory = [...history, newMessage]
      setHistory(newHistory)
      await generateResponse(newHistory)
    },
    [history, generateResponse]
  )

  const startRecording = useCallback(async () => {
    setConfiguringAudio(true)
    if (!audioStreamRef.current) {
      try {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        addToast(i18nCommon('error'))
        console.error('Error getting audio stream', e)
        setConfiguringAudio(false)
        return
      }
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
      await audioContextRef.current.audioWorklet.addModule('/audio/mono-processor.js')
    }
    const audioContext = audioContextRef.current
    if (audioContext.state == 'suspended') {
      audioContext.resume()
    }
    const source = (audioSourceRef.current = audioContext.createMediaStreamSource(audioStreamRef.current))
    const processorNode = (processorNodeRef.current = new AudioWorkletNode(audioContext, 'MonoProcessor'))
    const buffers: Int16Array[][] = (audioBuffersRef.current = [])
    const pushStream = (pushAudioInputStreamRef.current = AudioInputStream.createPushStream(
      AudioStreamFormat.getWaveFormatPCM(audioContext.sampleRate, 16, 1)
    ))
    processorNode.port.onmessage = (event) => {
      switch (event.data.type) {
        case 'interm':
          buffers.push(event.data.buffers)
          break
        case 'final':
          pushStream.write(event.data.buffer)
          break
        default:
          console.error('Unhandled data', event.data)
      }
    }
    const learningLanguage = LANGUAGES_MAP[localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale]
    const audioConfig = AudioConfig.fromStreamInput(pushStream)
    try {
      const speechConfig = await getSpeechConfig()
      speechConfig.speechRecognitionLanguage = learningLanguage.speechName
      speechRecognizerRef.current = new SpeechRecognizer(speechConfig, audioConfig)
    } catch (e) {
      await releaseInputAudioResources()
      setConfiguringAudio(false)
      return
    }
    const speechRecognizer = speechRecognizerRef.current

    lastMessageRef.current = ''
    speechRecognizer.recognized = (_, event) => {
      let result = event.result
      switch (result.reason) {
        case ResultReason.RecognizedSpeech:
          console.log('Speech recognized', result.text)
          if (lastMessageRef.current === '') {
            lastMessageRef.current = result.text
          } else if (learningLanguage.spaceDelimited) {
            // Add space for English or other space-delimited languages
            lastMessageRef.current += ' ' + result.text
          } else {
            lastMessageRef.current += result.text
          }
          break
        case ResultReason.NoMatch:
          console.log('Speech could not be recognized.')
          break
        case ResultReason.Canceled:
          console.log(`Speech recognization canceled: ${CancellationDetails.fromResult(result)}`)
          break
        default:
          console.log('Unknown recognition result received.', result)
      }
    }
    source.connect(processorNode) // Start recording
    if (isSafari()) {
      // Safari requires connecting to destination to start recording
      processorNode.connect(audioContext.destination)
    }
    setConfiguringAudio(false)
    setTranscribing(true)
    try {
      await startRecognition(speechRecognizer)
    } catch (e) {
      console.error('Error starting recognition', e)
      await releaseInputAudioResources()
      setTranscribing(false)
    }
  }, [addToast, i18nCommon, isSafari, releaseInputAudioResources])

  const stopRecording = useCallback(async () => {
    setConfiguringAudio(true)
    audioSourceRef.current?.disconnect()
    processorNodeRef.current?.port.close()
    processorNodeRef.current?.disconnect()
    audioSourceRef.current = null
    processorNodeRef.current = null
    pushAudioInputStreamRef.current?.close()
    try {
      await stopRecognition(speechRecognizerRef.current)
    } catch (e) {
      console.error('Error stopping recognition', e)
    }
    const audioBlob = exportAudioInWav(audioContextRef.current?.sampleRate ?? SAMPLE_RATE, audioBuffersRef.current)
    await releaseInputAudioResources()
    setTranscribing(false)
    setConfiguringAudio(false)

    const lastMessage = lastMessageRef.current
    lastMessageRef.current = ''
    if (lastMessage.trim()) {
      const newAudioMessage = new AudioChatMessage(lastMessage, false, audioBlob)
      await newAudioMessage.loadAudioMetadata()
      const newHistory = [...history, newAudioMessage]
      setHistory(newHistory)
      await generateResponse(newHistory)
    }
  }, [generateResponse, history, releaseInputAudioResources])

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
        <div className='h-full'>
          <div className='max-w-[650px] my-0 mx-auto p-3'>
            {history.map((msg) => (
              <ChatLineGroup key={msg.getId()} message={msg} shouldShowAiText={shouldShowAiText} />
            ))}
            {isTranscribing && <LoadingChatLineGroup isAi={false} />}
            <div className='clear-both h-32'></div>
          </div>
        </div>
        <ChatInput
          messageStates={{ isConfiguringAudio, isTranscribing, isStreaming, shouldShowAiText }}
          startRecording={startRecording}
          stopRecording={stopRecording}
          sendTextMessage={sendText}
          setShowText={setShowText}
        />
      </div>
    </main>
  )
}
