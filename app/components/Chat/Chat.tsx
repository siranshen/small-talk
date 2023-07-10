'use client'

import { ChatLineGroup, LoadingChatLineGroup } from './ChatLineGroup'
import { useEffect, useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'
import Link from 'next/link'

const MIME_TYPE = 'audio/webm'

export default function Chat() {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])

  const audioStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [isRecording, setRecording] = useState<boolean>(false)
  const [isTranscribing, setTranscribing] = useState<boolean>(false)
  const [isLoading, setLoading] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)
  const [audioUrl, setAudioUrl] = useState<string>('')

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
      console.log('Error calling LLM', e)
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

        lastMessage = lastMessage + chunkValue

        setHistory([...newHistory, new ChatMessage(lastMessage, true)])
        setStreaming(true)
        setLoading(false)
      }
    } catch (e) {
      console.log('Error while reading LLM response', e)
      setLoading(false)
    }
    setStreaming(false)
  }

  const startRecording = async () => {
    // TODO: Setup takes some time, so we should probably have a loading state here
    setRecording(true)
    if (!audioStreamRef.current) {
      try {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        console.log('Error getting audio stream', e)
        setRecording(false)
        return
      }
    }
    const media = new MediaRecorder(audioStreamRef.current, { mimeType: MIME_TYPE })
    mediaRecorderRef.current = media
    media.start()
    media.ondataavailable = (event) => {
      if (!event.data) {
        return
      }
      audioChunksRef.current.push(event.data)
    }
  }

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) {
      return
    }
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: MIME_TYPE })
      const audioUrl = URL.createObjectURL(audioBlob)
      // Websocket is probably the best way to do this, but it'll require a separate Websocket server...
      setAudioUrl(audioUrl)
      await stt(audioBlob)
      // URL.revokeObjectURL(audioUrl)
      audioChunksRef.current = []
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null
    setTranscribing(true)
    setRecording(false)
  }

  const stt = async (blob: Blob) => {
    const data = new FormData()
    data.append('audio', blob)
    const response = await fetch('/api/azurespeech', {
      method: 'POST',
      body: data,
    })
    console.log(`Response: ${await response.text()}`)
    setTranscribing(false)
  }

  return (
    <div className='my-0 mx-auto h-full overflow-scroll' ref={chatContainerRef}>
      <div className='h-full'>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {history.map((msg) => (
            <ChatLineGroup key={msg.getId()} message={msg} />
          ))}
          {audioUrl && <Link href={audioUrl} />}
          {isTranscribing && <LoadingChatLineGroup isAi={false} />}
          {isLoading && <LoadingChatLineGroup isAi />}
          <div className='clear-both h-32'></div>
        </div>
      </div>
      <ChatInput
        isLoading={isLoading}
        isStreaming={isStreaming}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        startRecording={startRecording}
        stopRecording={stopRecording}
        sendTextMessage={sendText}
      />
    </div>
  )
}
