'use client'

import { ChatLineGroup, LoadingChatLineGroup } from './ChatLineGroup'
import { useRef, useState } from 'react'
import { AudioChatMessage, ChatMessage } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'

const MIME_TYPE = 'audio/webm'

export default function Chat() {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [isRecording, setRecording] = useState<boolean>(false)
  const [isTranscribing, setTranscribing] = useState<boolean>(false)
  const [isLoading, setLoading] = useState<boolean>(false)
  const [isStreaming, setStreaming] = useState<boolean>(false)

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
    mediaRecorderRef.current.onstop = () => {
      const videoBlob = new Blob(audioChunksRef.current, { type: MIME_TYPE })
      const videoUrl = URL.createObjectURL(videoBlob)
      // TODO: send audio to server
      // Websocket is probably the best way to do this, but it'll require a separate Websocket server...
      audioChunksRef.current = []
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop())
    audioStreamRef.current = null
    setTranscribing(true)
    setRecording(false)
  }

  return (
    <div className='my-0 mx-auto h-full overflow-scroll'>
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
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        startRecording={startRecording}
        stopRecording={stopRecording}
        sendTextMessage={sendText}
      />
    </div>
  )
}
