'use client'

import ChatLineGroup, { LoadingChatLineGroup } from './ChatLineGroup'
import { useState } from 'react'
import { AudioChatMessage, ChatMessage } from '@/app/utils/chat-message'
import ChatInput from './ChatInput'

export default function Chat() {
  const [history, setHistory] = useState<ChatMessage[]>([])
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
        throw new Error("No response returned!")
      }
    } catch (e) {
      console.log("Error calling LLM", e)
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

        setHistory([
          ...newHistory,
          new ChatMessage(lastMessage, true)
        ])
        setStreaming(true)
        setLoading(false)
      }
    } catch (e) {
      console.log("Error while reading LLM response", e)
      setLoading(false)
    }
    setStreaming(false)
  }

  return (
    <div className='my-0 mx-auto h-full overflow-scroll'>
      <div className='h-full'>
        <div className='max-w-[650px] my-0 mx-auto p-3'>
          {history.map((msg) => (
            <ChatLineGroup key={msg.getId()} message={msg} />
          ))}
          {isLoading && (<LoadingChatLineGroup />)}
          <div className='clear-both h-32'></div>
        </div>
      </div>
      <ChatInput isLoading={isLoading} isStreaming={isStreaming} sendTextMessage={sendText} />
    </div>
  )
}
