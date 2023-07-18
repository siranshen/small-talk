'use client'

import { LANGUAGES } from '@/app/utils/i18n'
import SamePageModal from './SamePageModal'
import { useTranslations } from 'next-intl'
import Select from '../form/Select'

export default function SettingsModal({ isOpen, setOpen }: { isOpen: boolean; setOpen: Function }) {
  const i18n = useTranslations('Settings')
  return (
    <SamePageModal isOpen={isOpen} setOpen={setOpen}>
      <div className='flex flex-col items-stretch justify-center'>
        <h1 className='font-medium text-lg mb-2 text-center'>{i18n('title')}</h1>
        <Select label={i18n('systemLang')}>
          {LANGUAGES.map((lang) => (
            <option key={lang.locale} value={lang.locale}>
              {lang.name}
            </option>
          ))}
        </Select>
        <Select label={i18n('learningLang')}>
          {LANGUAGES.map((lang) => (
            <option key={lang.locale} value={lang.locale}>
              {lang.name}
            </option>
          ))}
        </Select>
        <div className='flex justify-around w-full'>
          <button className='solid-button flex-[0_1_90%] mt-4'>{i18n('confirm')}</button>
        </div>
      </div>
    </SamePageModal>
  )
}
