'use client'

import { ChatLineGroup, LoadingChatLineGroup } from './ChatLineGroup'
import { useEffect, useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage, PAUSE_TOKEN } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'
import {
  SpeechSynthesisTask,
  generateSpeech,
  getSpeechConfig,
  startRecognition,
  stopRecognition,
} from '@/app/utils/azure-speech'
import { AudioPlayTask, exportAudioInWav, exportBufferInWav, exportBuffersInWav } from '@/app/utils/audio'
import { queue } from 'async'
import {
  AudioConfig,
  AudioInputStream,
  CancellationDetails,
  CancellationReason,
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
  const [isLoading, setLoading] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)

  useEffect(() => {
    if (!chatContainerRef.current) {
      return
    }
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
  }, [history])

  const generateResponse = async (newHistory: ChatMessage[]) => {
    setLoading(true)
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
      setLoading(false)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let done = false
    let lastMessage = '',
      lastPauseIndex = 0
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm
    const speechSynthesizer = (speechSynthesizerRef.current = new SpeechSynthesizer(speechConfig))
    const audioBuffers: ArrayBuffer[] = []
    const audioPlayQueue = queue(async (task: AudioPlayTask, _) => {
      audioBuffers.push(task.audioData)
      const tempAudioBlob = exportBufferInWav(SAMPLE_RATE, 1, task.audioData)
      const tempAudioUrl = URL.createObjectURL(tempAudioBlob)
      await new Promise<void>((resolve) => {
        const audio = new Audio(tempAudioUrl)
        audio.onended = () => {
          URL.revokeObjectURL(tempAudioUrl)
          resolve()
        }
        audio.play()
      })
    }, 1)
    const speechSynthesisQueue = queue(async (task: SpeechSynthesisTask, _) => {
      if (task.text.trim() === '') {
        return
      }
      try {
        const audioData = await generateSpeech(speechSynthesizer, task.text, 'en-US')
        audioPlayQueue.push({ audioData })
      } catch (e) {
        console.error('Error generating speech', e)
        return
      }
    }, 1)
    try {
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        lastMessage += chunkValue
        const pauseIndex = lastMessage.lastIndexOf(PAUSE_TOKEN)
        if (pauseIndex > lastPauseIndex) {
          speechSynthesisQueue.push({ text: lastMessage.substring(lastPauseIndex, pauseIndex) })
          lastPauseIndex = pauseIndex + PAUSE_TOKEN.length
        }

        setHistory([...newHistory, new ChatMessage(lastMessage, true)])
        setLoading(false)
        setStreaming(true)
      }
      speechSynthesisQueue.push({ text: lastMessage.substring(lastPauseIndex) })
      await speechSynthesisQueue.drain()
      await Promise.all([audioPlayQueue.drain(), await releaseOutputAudioResources()])
      const audioBlob = exportBuffersInWav(SAMPLE_RATE, 1, audioBuffers)
      const audioUrl = URL.createObjectURL(audioBlob)
      setHistory([...newHistory, new AudioChatMessage(lastMessage, true, audioUrl)])
    } catch (e) {
      console.error('Error while reading LLM response', e)
      setLoading(false)
    }
    setStreaming(false)
  }

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
          const cancellation = CancellationDetails.fromResult(result)
          console.log(`Speech recognization canceled: ${cancellation.reason}`)

          if (cancellation.reason == CancellationReason.Error) {
            console.error(`Speech recognization error: ${cancellation.ErrorCode}, ${cancellation.errorDetails}`)
          }
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
    setTranscribing(false)
    setConfiguringAudio(true)
    try {
      await stopRecognition(speechRecognizerRef.current)
    } catch (e) {
      console.error('Error stopping recognition', e)
    }
    const audioBlob = exportAudioInWav(SAMPLE_RATE, audioBuffersRef.current)
    const audioUrl = URL.createObjectURL(audioBlob)
    await releaseInputAudioResources()
    setConfiguringAudio(false)

    const lastMessage = lastMessageRef.current
    lastMessageRef.current = ''
    if (lastMessage.trim()) {
      const newHistory = [...history, new AudioChatMessage(lastMessage, false, audioUrl)]
      setHistory(newHistory)
      await generateResponse(newHistory)
    }
  }

  const releaseInputAudioResources = async () => {
    audioBuffersRef.current = []
    await audioContextRef.current?.close()
    audioContextRef.current = null
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null
    pushAudioInputStreamRef.current?.close()
    pushAudioInputStreamRef.current = null
    speechRecognizerRef.current?.close()
    speechRecognizerRef.current = null
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
        isConfiguringAudio={isConfiguringAudio}
        isTranscribing={isTranscribing}
        startRecording={startRecording}
        stopRecording={stopRecording}
        sendTextMessage={sendText}
      />
    </div>
  )
}
