import dedent from 'dedent'
import getResponseStream from '@/app/utils/openai'
import { NextRequest, NextResponse } from 'next/server'

const constructSystemPrompt = (language: string, evalLanguage: string, evaluation: string) => {
  return dedent`You are a professional ${evalLanguage} teacher.
  You are given an evaluation of a user's performance based on a previous chat in ${evalLanguage}. The user is learning ${evalLanguage}.
  Your task is to answer user's questions regarding the evaluation and ${evalLanguage} in general.

  ## Rules
  - Respond in ${language}.
  - When asked questions unrelated to the evaluation or ${evalLanguage}, simply respond that you can't answer.

  ## Evaluation
  ${evaluation}`
}

export async function POST(request: NextRequest) {
  const { evaluation, messages, language, evalLanguage } = await request.json()
  try {
    const stream = await getResponseStream(constructSystemPrompt(language, evalLanguage, evaluation), messages)
    return new NextResponse(stream)
  } catch (e) {
    console.log('Error calling OpenAI', e)
    return new NextResponse('Error calling OpenAI', { status: 500 })
  }
}
