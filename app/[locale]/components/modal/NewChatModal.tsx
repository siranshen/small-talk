'use client'

import { LANGUAGES, LANGUAGES_MAP, Language } from '@/app/utils/i18n'
import SamePageModal from '@/app/components/modal/SamePageModal'
import Select from '@/app/components/form/Select'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next-intl/client'
import TextArea from '@/app/components/form/TextArea'
import { LEARNING_LANG_KEY, LEVEL_KEY, TOPIC_KEY, TOPIC_PROMPT_KEY, VOICE_NAME_KEY } from '@/app/utils/local-keys'

export default function NewChatModal({
  isOpen,
  setOpen,
  topic,
}: {
  isOpen: boolean
  setOpen: (open: boolean) => void
  topic: string | null
}) {
  const i18n = useTranslations('NewChatSettings')
  const i18nCommon = useTranslations('Common')

  const learningLangRef = useRef<HTMLSelectElement>(null)
  const levelRef = useRef<HTMLSelectElement>(null)
  const characterRef = useRef<HTMLSelectElement>(null)
  const topicRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const [learningLang, setLearningLang] = useState<Language | null>(null)

  /* Run once */
  useEffect(() => {
    router.prefetch('/chat')
    if (!learningLangRef.current || !levelRef.current) {
      return
    }
    learningLangRef.current.value = localStorage.getItem(LEARNING_LANG_KEY) ?? LANGUAGES[0].locale
    levelRef.current.value = localStorage.getItem(LEVEL_KEY) ?? 'beginner'
    setLearningLang(LANGUAGES_MAP[learningLangRef.current.value])
  }, [router])

  const configureNewChat = useCallback(() => {
    if (!learningLangRef.current || !levelRef.current || !characterRef.current) {
      return
    }
    localStorage.setItem(LEARNING_LANG_KEY, learningLangRef.current.value)
    localStorage.setItem(LEVEL_KEY, levelRef.current.value)
    sessionStorage.setItem(VOICE_NAME_KEY, characterRef.current.value)
    if (topic !== null) {
      sessionStorage.setItem(TOPIC_KEY, topic)
      sessionStorage.setItem(TOPIC_PROMPT_KEY, topic)
    } else {
      sessionStorage.removeItem(TOPIC_KEY)
      sessionStorage.setItem(TOPIC_PROMPT_KEY, topicRef.current?.value ?? '')
    }
    setOpen(false)
    router.push('/chat')
  }, [router, setOpen, topic])

  return (
    <SamePageModal isOpen={isOpen} setOpen={setOpen}>
      <div>
        <div className='font-medium text-xl mb-4 relative'>
          <span>{i18n('title')}</span>
        </div>
        <Select
          label={i18n('learningLang')}
          id='learning-lang'
          ref={learningLangRef}
          onChange={(e) => {
            setLearningLang(LANGUAGES_MAP[e.target.value])
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.locale} value={lang.locale}>
              {lang.name}
            </option>
          ))}
        </Select>
        <Select label={i18n('level')} id='level' ref={levelRef}>
          {['beginner', 'intermediate', 'advanced'].map((key) => (
            <option key={key} value={key}>
              {i18n(`levelOptions.${key}`)}
            </option>
          ))}
        </Select>
        {learningLang && (
          <Select label={i18n('character')} id='character' ref={characterRef}>
            {learningLang.voiceNames.map((voice, index) => (
              <option key={voice.code} value={index}>
                {voice.name}
              </option>
            ))}
          </Select>
        )}
        <TextArea
          label={i18n('topic')}
          id='topic'
          rows={2}
          placeholder={i18n('topicPlaceholder')}
          value={topic ?? ''}
          ref={topicRef}
        />
        <div className='flex justify-end w-full mt-10'>
          <button
            className='solid-button-light rounded-lg flex-[0_1_35%] sm:flex-[0_1_30%] mr-2'
            onClick={() => setOpen(false)}
          >
            {i18nCommon('cancel')}
          </button>
          <button className='solid-button rounded-lg flex-[0_1_35%] sm:flex-[0_1_30%]' onClick={configureNewChat}>
            {i18nCommon('confirm')}
          </button>
        </div>
      </div>
    </SamePageModal>
  )
}
