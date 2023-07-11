'use client'

import { ChatLineGroup, LoadingChatLineGroup } from './ChatLineGroup'
import { useEffect, useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'
import {
  AudioConfig,
  AudioInputStream,
  CancellationDetails,
  CancellationReason,
  PushAudioInputStream,
  ResultReason,
  SpeechRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk'
import { getSpeechRecognizer, startRecognition, stopRecognition } from '@/app/utils/azure-speech'

export default function Chat() {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])

  const audioStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const speechRecognizerRef = useRef<SpeechRecognizer | null>(null)
  const pushAudioInputStreamRef = useRef<PushAudioInputStream | null>(null)
  const lastMessageRef = useRef<string>('')
  const [isBootstrappingAudio, setBootstrappingAudio] = useState<boolean>(false)
  const [isTranscribing, setTranscribing] = useState<boolean>(false)
  const [isLoading, setLoading] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)

  useEffect(() => {
    if (!chatContainerRef.current) {
      return
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [history])

  const sendText = async (message: string) => {
    setLoading(true)
    const newMessage = new ChatMessage(message, false)
    const newHistory = [...history, newMessage]
    setHistory(newHistory)

    let dataStream
    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newHistory.slice(-8).map((msg) => msg.toGPTMessage()),
        }),
      })
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      dataStream = response.body
      if (!dataStream) {
        throw new Error('No response returned!')
      }
    } catch (e) {
      console.error('Error calling LLM', e)
      setLoading(false)
      return
    }

    const reader = dataStream.getReader()
    const decoder = new TextDecoder()
    let done = false
    let lastMessage = ''
    try {
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        lastMessage += chunkValue

        setHistory([...newHistory, new ChatMessage(lastMessage, true)])
        setLoading(false)
        setStreaming(true)
      }
    } catch (e) {
      console.error('Error while reading LLM response', e)
      setLoading(false)
    }
    setStreaming(false)
  }

  const startRecording = async () => {
    setBootstrappingAudio(true)
    if (!audioStreamRef.current) {
      try {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        console.error('Error getting audio stream', e)
        setBootstrappingAudio(false)
        return
      }
    }
    if (!audioContextRef.current) {
      // Azure Speech SDK accepts 16kHz mono PCM by default
      const audioContext = (audioContextRef.current = new AudioContext({ sampleRate: 16000 }))
      const source = audioContext.createMediaStreamSource(audioStreamRef.current)
      await audioContext.audioWorklet.addModule('audio/mono-processor.js')
      const processorNode = new AudioWorkletNode(audioContext, 'MonoProcessor')
      const pushStream = (pushAudioInputStreamRef.current = AudioInputStream.createPushStream())
      processorNode.port.onmessage = (event) => {
        pushStream.write(new Int16Array(event.data).buffer)
      }
      source.connect(processorNode)
      const audioConfig = AudioConfig.fromStreamInput(pushStream)
      try {
        speechRecognizerRef.current = await getSpeechRecognizer(audioConfig)
      } catch (e) {
        releaseAudioResources()
        setBootstrappingAudio(false)
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
            const cancellation = CancellationDetails.fromResult(result)
            console.log(`Speech recognization canceled: ${cancellation.reason}`)

            if (cancellation.reason == CancellationReason.Error) {
              console.error(`Speech recognization error: ${cancellation.ErrorCode}, ${cancellation.errorDetails}`)
            }
            break
        }
      }
      setBootstrappingAudio(false)
      setTranscribing(true)
      try {
        await startRecognition(speechRecognizer)
      } catch (e) {
        console.error('Error starting recognition', e)
        releaseAudioResources()
        setTranscribing(false)
      }
    }
  }

  const stopRecording = async () => {
    try {
      await stopRecognition(speechRecognizerRef.current)
    } catch (e) {
      console.error('Error stopping recognition', e)
    }
    releaseAudioResources()
    setTranscribing(false)
    const lastMessage = lastMessageRef.current
    lastMessageRef.current = ''
    if (lastMessage.trim()) {
      await sendText(lastMessage)
    }
  }

  const releaseAudioResources = () => {
    speechRecognizerRef.current?.close()
    speechRecognizerRef.current = null
    pushAudioInputStreamRef.current?.close()
    pushAudioInputStreamRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null
  }

  return (
    <div className='my-0 mx-auto h-full overflow-scroll' ref={chatContainerRef}>
      <div className='h-full'>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {history.map((msg) => (
            <ChatLineGroup key={msg.getId()} message={msg} />
          ))}
          {isTranscribing && <LoadingChatLineGroup isAi={false} />}
          {isLoading && <LoadingChatLineGroup isAi />}
          <div className='clear-both h-32'></div>
        </div>
      </div>
      <ChatInput
        isLoading={isLoading}
        isStreaming={isStreaming}
        isBootstrappingAudio={isBootstrappingAudio}
        isTranscribing={isTranscribing}
        startRecording={startRecording}
        stopRecording={stopRecording}
        sendTextMessage={sendText}
      />
    </div>
  )
}
