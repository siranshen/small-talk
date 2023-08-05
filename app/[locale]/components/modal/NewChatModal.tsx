'use client'

import { LANGUAGES, LANGUAGES_MAP, Language } from '@/app/utils/i18n'
import SamePageModal from '@/app/components/modal/SamePageModal'
import Select from '@/app/components/form/Select'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next-intl/client'
import TextArea from '@/app/components/form/TextArea'
import { LEARNING_LANG_FIELD, VOICE_NAME_FIELD } from '@/app/utils/local-keys'

export default function NewChatModal({
  isCustomizable,
  isOpen,
  setOpen,
}: {
  isCustomizable: boolean
  isOpen: boolean
  setOpen: Function
}) {
  const i18n = useTranslations('NewChat')
  const i18nCommon = useTranslations('Common')

  const learningLangRef = useRef<HTMLSelectElement>(null)
  const characterRef = useRef<HTMLSelectElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const [learningLang, setLearningLang] = useState<Language | null>(null)

  useEffect(() => {
    if (!learningLangRef.current) {
      return
    }
    learningLangRef.current.value = localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale
    setLearningLang(LANGUAGES_MAP[learningLangRef.current.value])
  }, [])

  const configureNewChat = useCallback(() => {
    if (!learningLangRef.current || !characterRef.current) {
      return
    }
    localStorage.setItem(LEARNING_LANG_FIELD, learningLangRef.current.value)
    sessionStorage.setItem(VOICE_NAME_FIELD, characterRef.current.value)
    setOpen(false)
    router.push('/chat')
  }, [router, setOpen])

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
        {learningLang && (
          <Select label={i18n('character')} id='character' ref={characterRef}>
            {learningLang.voiceNames.map((voice, index) => (
              <option key={voice.code} value={index}>
                {voice.name}
              </option>
            ))}
          </Select>
        )}
        {isCustomizable && (
          <TextArea label={i18n('prompt.title')} id='prompt' placeholder={i18n('prompt.placeholder')} ref={promptRef} />
        )}
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
