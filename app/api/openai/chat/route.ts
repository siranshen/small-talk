import { PAUSE_TOKEN } from '@/app/utils/chat-message'
import getResponseStream from '@/app/utils/openai'
import dedent from 'dedent'
import { NextRequest, NextResponse } from 'next/server'

const constructSystemPrompt = (language: string, level: string, selfIntro: string, speakerName: string, scenario: string) => {
  return dedent`You are ${speakerName}, a native ${language} speaker. Your task is to talk with the user.

  ## Scenario
  ${scenario}${selfIntro ? `\n\n## User's Info\n${selfIntro}` : ''}

  ## Rules
  - Use ${language} to communicate with the user.${
    level ? `\n- User's language skill is ${level} level. You should adjust your language accordingly.` : ''
  }
  - Talk in an informal tone as a friend.
  - Keep your response concise.
  - Adhere to the scenario if it is defined.
  - Ask a question or change the subject if the conversation is not going well.
  - Ask one question at a time.

  ## Response Format
  - Add a special token ${PAUSE_TOKEN} where appropriate to simulate a pause in human conversations.
  ### Example
  Hey, man! I haven't seen you for a while. ${PAUSE_TOKEN} I've been working a project lately, which is getting really run! ${PAUSE_TOKEN} How about you?`
}

export async function POST(request: NextRequest) {
  const { messages, language, level, selfIntro, speakerName, scenario } = await request.json()
  try {
    const stream = await getResponseStream(constructSystemPrompt(language, level, selfIntro, speakerName, scenario), messages)
    return new NextResponse(stream)
  } catch (e) {
    console.log('Error calling OpenAI', e)
    return new NextResponse('Error calling OpenAI', { status: 500 })
  }
}
