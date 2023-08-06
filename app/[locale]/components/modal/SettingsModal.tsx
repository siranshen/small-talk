'use client'

import { LANGUAGES } from '@/app/utils/i18n'
import SamePageModal from '@/app/components/modal/SamePageModal'
import Select from '@/app/components/form/Select'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next-intl/client'
import { LEVEL_KEY, SELF_INTRO_KEY, SYSTEM_LANG_KEY } from '@/app/utils/local-keys'
import TextArea from '@/app/components/form/TextArea'

export default function SettingsModal({ isOpen, setOpen }: { isOpen: boolean; setOpen: Function }) {
  const i18n = useTranslations('Settings')
  const i18nCommon = useTranslations('Common')

  const systemLangRef = useRef<HTMLSelectElement>(null)
  const levelRef = useRef<HTMLSelectElement>(null)
  const selfIntroRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!systemLangRef.current || !levelRef.current || !selfIntroRef.current) {
      return
    }
    systemLangRef.current.value = localStorage.getItem(SYSTEM_LANG_KEY) ?? LANGUAGES[0].locale
    levelRef.current.value = localStorage.getItem(LEVEL_KEY) ?? 'beginner'
    selfIntroRef.current.value = localStorage.getItem(SELF_INTRO_KEY) ?? ''
  }, [])

  const setLanguages = useCallback(() => {
    if (!systemLangRef.current || !levelRef.current || !selfIntroRef.current) {
      return
    }
    localStorage.setItem(SYSTEM_LANG_KEY, systemLangRef.current.value)
    localStorage.setItem(LEVEL_KEY, levelRef.current.value)
    localStorage.setItem(SELF_INTRO_KEY, selfIntroRef.current.value)
    setOpen(false)
    router.replace(pathname, { locale: systemLangRef.current.value })
  }, [pathname, router, setOpen])

  return (
    <SamePageModal isOpen={isOpen} setOpen={setOpen}>
      <div>
        <div className='font-medium text-xl mb-4 relative'>
          <span>{i18n('title')}</span>
        </div>
        <Select label={i18n('systemLang')} id='system-lang' ref={systemLangRef}>
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
        <TextArea label={i18n('selfIntro')} id='selfIntro' placeholder={i18n('selfIntroPlaceholder')} ref={selfIntroRef} />
        <div className='flex justify-end w-full mt-10'>
          <button
            className='solid-button-light rounded-lg flex-[0_1_35%] sm:flex-[0_1_30%] mr-2'
            onClick={() => setOpen(false)}
          >
            {i18nCommon('cancel')}
          </button>
          <button className='solid-button rounded-lg flex-[0_1_35%] sm:flex-[0_1_30%]' onClick={setLanguages}>
            {i18nCommon('confirm')}
          </button>
        </div>
      </div>
    </SamePageModal>
  )
}
