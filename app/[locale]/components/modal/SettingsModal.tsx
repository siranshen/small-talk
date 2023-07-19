'use client'

import { LANGUAGES, LEARNING_LANG_FIELD, SYSTEM_LANG_FIELD } from '@/app/utils/i18n'
import SamePageModal from './SamePageModal'
import { useTranslations } from 'next-intl'
import Select from '../form/Select'
import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next-intl/client'

export default function SettingsModal({ isOpen, setOpen }: { isOpen: boolean; setOpen: Function }) {
  const i18n = useTranslations('Settings')
  const i18nCommon = useTranslations('Common')

  const systemLangRef = useRef<HTMLSelectElement>(null)
  const learningLangRef = useRef<HTMLSelectElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!systemLangRef.current || !learningLangRef.current) {
      return
    }
    systemLangRef.current.value = localStorage.getItem(SYSTEM_LANG_FIELD) ?? LANGUAGES[0].locale
    learningLangRef.current.value = localStorage.getItem(LEARNING_LANG_FIELD) ?? LANGUAGES[0].locale
  }, [])

  const setLanguages = useCallback(() => {
    if (!systemLangRef.current || !learningLangRef.current) {
      return
    }
    localStorage.setItem(SYSTEM_LANG_FIELD, systemLangRef.current.value)
    localStorage.setItem(LEARNING_LANG_FIELD, learningLangRef.current.value)
    setOpen(false)
    router.replace(pathname, {locale: systemLangRef.current.value})
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
        <Select label={i18n('learningLang')} id='learning-lang' ref={learningLangRef}>
          {LANGUAGES.map((lang) => (
            <option key={lang.locale} value={lang.locale}>
              {lang.name}
            </option>
          ))}
        </Select>
        <div className='flex justify-end w-full mt-10'>
          <button className='solid-button-light rounded-lg flex-[0_1_30%] mr-2' onClick={() => setOpen(false)}>
            {i18nCommon('cancel')}
          </button>
          <button className='solid-button rounded-lg flex-[0_1_30%]' onClick={setLanguages}>
            {i18nCommon('confirm')}
          </button>
        </div>
      </div>
    </SamePageModal>
  )
}
