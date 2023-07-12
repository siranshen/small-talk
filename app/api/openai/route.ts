import { PAUSE_TOKEN } from '@/app/utils/chat-message'
import { ParsedEvent, ReconnectInterval, createParser } from 'eventsource-parser'
import { NextRequest, NextResponse } from 'next/server'

const URL = 'https://api.openai.com/v1/chat/completions'
const SYSTEM_PROMPT = `You are an English native speaker, talking to a person that is a non-native speaker. Talk in an informal tone as a friend.
Add a special token ${PAUSE_TOKEN} at the end of every sentence to simulate a pause when a real person talks.
For example: "Hey, man! ${PAUSE_TOKEN} I haven't seen you for a while. ${PAUSE_TOKEN} How've you been?"`

export async function POST(request: NextRequest) {
  const { messages } = await request.json()
  const res = await fetch(URL, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...(process.env.OPENAI_ORGANIZATION && {
        'OpenAI-Organization': process.env.OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.2,
      stream: true,
    }),
  })

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (res.status !== 200) {
    const result = await res.json()
    console.log(`OpenAI API returned an error: ${result?.error || decoder.decode(result?.value) || result.statusText}`)
    return new NextResponse('Error calling OpenAI', { status: 500 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data

          try {
            const json = JSON.parse(data)
            if (json.choices[0].finish_reason != null) {
              controller.close()
              return
            }
            const text = json.choices[0].delta.content
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (e) {
            controller.error(e)
          }
        }
      }

      const parser = createParser(onParse)

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    },
  })

  return new NextResponse(stream)
}
