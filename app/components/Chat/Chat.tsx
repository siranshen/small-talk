'use client'

import { ChatLineGroup, LoadingChatLineGroup } from './ChatLineGroup'
import { useEffect, useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage, PAUSE_TOKEN } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'
import { SpeechSynthesisTaskProcessor, getSpeechConfig, startRecognition, stopRecognition } from '@/app/utils/azure-speech'
import { exportAudioInWav } from '@/app/utils/audio'
import {
  AudioConfig,
  AudioInputStream,
  CancellationDetails,
  PushAudioInputStream,
  ResultReason,
  SpeechRecognizer,
  SpeechSynthesisOutputFormat,
  SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk'

const SAMPLE_RATE = 16000

export default function Chat() {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])

  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null)
  const speechSynthesizerRef = useRef<SpeechSynthesizer | null>(null)
  const pushAudioInputStreamRef = useRef<PushAudioInputStream | null>(null)
  const audioBuffersRef = useRef<Int16Array[][]>([])
  const lastMessageRef = useRef<string>('')
  const [isConfiguringAudio, setConfiguringAudio] = useState<boolean>(false)
  const [isTranscribing, setTranscribing] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)
  const [shouldShowAiText, setShowText] = useState<boolean>(true)

  useEffect(() => {
    const shouldShow = localStorage.getItem('shouldShowAiText')
    setShowText(shouldShow === null || shouldShow === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('shouldShowAiText', shouldShowAiText ? 'true' : 'false')
  }, [shouldShowAiText])

  useEffect(() => {
    if (!chatContainerRef.current) {
      return
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [history])

  /* Request LLM to generate response and then synthesize voice */
  const generateResponse = async (newHistory: ChatMessage[]) => {
    setStreaming(true)
    setHistory([...newHistory, new ChatMessage('', true, true)])
    let response, speechConfig
    try {
      const llmCallPromise = fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newHistory.slice(-8).map((msg) => msg.toGPTMessage()),
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
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm
    const speechSynthesizer = (speechSynthesizerRef.current = new SpeechSynthesizer(
      speechConfig,
      null as unknown as AudioConfig
    ))
    const speechSynthesisTaskProcessor = new SpeechSynthesisTaskProcessor(speechSynthesizer, SAMPLE_RATE)
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
      console.error('Error while reading LLM response', e)
    }
    await releaseOutputAudioResources()
    setStreaming(false)
  }

  /* Send user text message */
  const sendText = async (message: string) => {
    const newMessage = new ChatMessage(message, false)
    const newHistory = [...history, newMessage]
    setHistory(newHistory)
    await generateResponse(newHistory)
  }

  const startRecording = async () => {
    setConfiguringAudio(true)
    if (!audioStreamRef.current) {
      try {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        console.error('Error getting audio stream', e)
        setConfiguringAudio(false)
        return
      }
    }
    if (!audioContextRef.current) {
      // Azure accepts 16kHz 16-bit mono PCM by default
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      await audioContextRef.current.audioWorklet.addModule('/audio/mono-processor.js')
    }
    const audioContext = audioContextRef.current
    const source = audioContext.createMediaStreamSource(audioStreamRef.current)
    const processorNode = new AudioWorkletNode(audioContext, 'MonoProcessor')
    const buffers: Int16Array[][] = (audioBuffersRef.current = [])
    const pushStream = (pushAudioInputStreamRef.current = AudioInputStream.createPushStream())
    processorNode.port.onmessage = (event) => {
      switch (event.data.type) {
        case 'interm':
          buffers.push(event.data.buffer)
          break
        case 'final':
          pushStream.write(new Int16Array(event.data.outputChannel).buffer)
          break
      }
    }
    const audioConfig = AudioConfig.fromStreamInput(pushStream)
    try {
      const speechConfig = await getSpeechConfig()
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
          // TODO: Adding space for English or similar languages. Not required for languages that don't use space.
          if (lastMessageRef.current === '') {
            lastMessageRef.current = result.text
          } else {
            lastMessageRef.current += ' ' + result.text
          }
          break
        case ResultReason.NoMatch:
          console.log('Speech could not be recognized.')
          break
        case ResultReason.Canceled:
          console.log(`Speech recognization canceled: ${CancellationDetails.fromResult(result)}`)
          break
      }
    }
    source.connect(processorNode) // Start recording
    setConfiguringAudio(false)
    setTranscribing(true)
    try {
      await startRecognition(speechRecognizer)
    } catch (e) {
      console.error('Error starting recognition', e)
      await releaseInputAudioResources()
      setTranscribing(false)
    }
  }

  const stopRecording = async () => {
    setConfiguringAudio(true)
    try {
      await stopRecognition(speechRecognizerRef.current)
    } catch (e) {
      console.error('Error stopping recognition', e)
    }
    const audioBlob = exportAudioInWav(SAMPLE_RATE, audioBuffersRef.current)
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
  }

  const releaseInputAudioResources = async () => {
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null
    await audioContextRef.current?.close()
    audioContextRef.current = null
    pushAudioInputStreamRef.current?.close()
    pushAudioInputStreamRef.current = null
    speechRecognizerRef.current?.close()
    speechRecognizerRef.current = null
    audioBuffersRef.current = []
  }

  const releaseOutputAudioResources = async () => {
    speechSynthesizerRef.current?.close()
    speechSynthesizerRef.current = null
  }

  return (
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
  )
}
