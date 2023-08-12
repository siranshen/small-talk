import { ChatMessage, deserializeConvo } from '@/app/utils/chat-message'
import { LANGUAGES, LANGUAGES_MAP } from '@/app/utils/i18n'
import { SYSTEM_LANG_KEY } from '@/app/utils/local-keys'
import { useTranslations } from 'next-intl'
import { Caveat } from 'next/font/google'
import { memo, useEffect, useState } from 'react'
import { remark } from 'remark'
import html from 'remark-html'

const handwrittenFont = Caveat({
  weight: '700',
  subsets: ['latin'],
})

export interface StorageData {
  convo: string | null
  learningLang: string
  systemLang: string
}

async function fetchEvaluation(
  convo: ChatMessage[],
  systemLang: string,
  learningLang: string,
  setEvaluationText: (text: string) => void,
  setEvaluationHtml: (html: string) => void,
  setLoaded: (loaded: boolean) => void
): Promise<void> {
  const response = await fetch('/api/openai/review/evaluation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: convo.slice(-10).map((msg) => msg.toGPTMessage(true)), // TODO: Calculate tokens used
      language: systemLang,
      evalLanguage: learningLang,
    }),
  })

  if (!response.ok) {
    console.log('Received response with status', response.status, response.statusText)
    return
  }
  if (!response.body) {
    console.error('No response returned!')
    return
  }
  setLoaded(true)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let done = false
  let evaluationText = ''
  while (!done) {
    const { value, done: doneReading } = await reader.read()
    done = doneReading
    evaluationText += decoder.decode(value)
    const processedContent = await remark().use(html).process(evaluationText)
    setEvaluationText(evaluationText)
    setEvaluationHtml(processedContent.toString())
  }
}

function EvaluationCardLayout({ children }: { children: React.ReactNode }) {
  return <div className='animate-[fade-in_300ms] rounded-lg border border-solid border-zinc-300 mb-6 px-5 py-4'>{children}</div>
}

function EvaluationCard({
  storageData,
  evaluationRef,
  setLoaded,
}: {
  storageData: StorageData
  evaluationRef: React.MutableRefObject<string>
  setLoaded: (loaded: boolean) => void
}) {
  const i18n = useTranslations('Review')
  const i18nCommon = useTranslations('Common')

  const [rounds, setRounds] = useState<number>(0)
  const [wordsUsed, setWordsUsed] = useState<number>(0)
  const [evaluationText, setEvaluationText] = useState<string>('')
  const [evaluationHtml, setEvaluationHtml] = useState<string>('')
  evaluationRef.current = evaluationText

  useEffect(() => {
    if (storageData.convo === null) {
      setLoaded(true)
      return
    }
    const convo = deserializeConvo(storageData.convo)
    if (convo.length === 0) {
      setLoaded(true)
      return
    }
    const learningLanguage = LANGUAGES_MAP[storageData.learningLang]
    const rounds = convo.reduce((acc, cur) => acc + (cur.isAiMessage() ? 0 : 1), 0)
    let wordsUsed = 0
    if (learningLanguage.characterBased) {
      // A rough estimate of the number of characters used (not excluding punctuation marks, etc.)
      wordsUsed = convo.reduce((acc, cur) => acc + (cur.isAiMessage() ? 0 : cur.getText().length), 0)
    } else {
      wordsUsed = convo.reduce((acc, cur) => acc + (cur.isAiMessage() ? 0 : cur.getText().split(/\s+/).length), 0)
    }
    setRounds(rounds)
    setWordsUsed(wordsUsed)

    const systemLanguage = LANGUAGES_MAP[localStorage.getItem(SYSTEM_LANG_KEY) ?? LANGUAGES[0].locale]
    fetchEvaluation(convo, systemLanguage.locale, learningLanguage.locale, setEvaluationText, setEvaluationHtml, setLoaded)
  }, [i18nCommon, setLoaded, storageData.convo, storageData.learningLang])

  if (storageData.convo === null || deserializeConvo(storageData.convo).length === 0) {
    return <EvaluationCardLayout>{i18n('evaluationCard.noConvo')}</EvaluationCardLayout>
  }

  return (
    <EvaluationCardLayout>
      <div className='flex justify-evenly mb-4 text-center font-medium text-xl'>
        <div className='flex flex-col px-5 py-3'>
          <div className='opacity-90'>{i18n('evaluationCard.rounds')}</div>
          <div className={`${handwrittenFont.className} text-3xl`}>{rounds}</div>
        </div>
        <div className='flex flex-col px-5 py-3'>
          <div className=''>
            {LANGUAGES_MAP[storageData.learningLang].characterBased
              ? i18n('evaluationCard.charactersUsed')
              : i18n('evaluationCard.wordsUsed')}
          </div>
          <div className={`${handwrittenFont.className} text-3xl`}>{wordsUsed}</div>
        </div>
      </div>
      {i18n.rich('evaluationCard.intro', {
        p: (paragraph) => <div className='mb-4 leading-6'>{paragraph}</div>,
      })}
      <div className='mb-4 leading-6 list-disc' dangerouslySetInnerHTML={{ __html: evaluationHtml }}></div>
    </EvaluationCardLayout>
  )
}

export default memo(EvaluationCard)
