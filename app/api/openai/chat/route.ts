import { PAUSE_TOKEN } from '@/app/utils/chat-message'
import getResponseStream from '@/app/utils/openai'
import dedent from 'dedent'
import { NextRequest, NextResponse } from 'next/server'

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
  try {
    const stream = await getResponseStream(constructSystemPrompt(language, speakerName), messages)
    return new NextResponse(stream)
  } catch (e) {
    console.log('Error calling OpenAI', e)
    return new NextResponse('Error calling OpenAI', { status: 500 })
  }
}
