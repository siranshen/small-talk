import { PAUSE_TOKEN } from '@/app/utils/chat-message'
import dedent from 'dedent'
import { ParsedEvent, ReconnectInterval, createParser } from 'eventsource-parser'
import { NextRequest, NextResponse } from 'next/server'

const URL = 'https://api.openai.com/v1/chat/completions'

const constructSystemPrompt = (language: string, speakerName: string) => {
  return dedent`You are ${speakerName}, a native ${language} speaker, talking to a person that is a non-native speaker.

  ## Rules
  - Talk in an informal tone as a friend.
  - Keep your response concise.
  - Ask question or change the subject if the conversation is not going well.
  - Ask one question at a time.

  ## Output Format
  - Add a special token ${PAUSE_TOKEN} where appropriate to simulate a pause in human conversations.
  For example:
  - "Hey, man! I haven't seen you for a while. ${PAUSE_TOKEN} I've been working a project lately, which is getting really run! ${PAUSE_TOKEN} How about you?"`
}

export async function POST(request: NextRequest) {
  const { messages, language, speakerName } = await request.json()
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
          content: constructSystemPrompt(language, speakerName),
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.8,
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
          if (data === '[DONE]') {
            controller.close()
            return
          }

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
