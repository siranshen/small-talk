export interface Language {
  name: string
  locale: string
  spaceDelimited: boolean
  characterBased: boolean
  speechName: string
  voiceNames: VoiceName[]
}

export interface VoiceName {
  name: string
  code: string
  gender: 'M' | 'F'
}

export const LANGUAGES: Language[] = [
  {
    name: 'English',
    locale: 'en',
    spaceDelimited: true,
    characterBased: false,
    speechName: 'en-US',
    voiceNames: [
      {
        name: 'Guy',
        code: 'en-US-GuyNeural',
        gender: 'M',
      },
      {
        name: 'Aria',
        code: 'en-US-AriaNeural',
        gender: 'F',
      },
    ],
  },
  {
    name: '简体中文',
    locale: 'zh-cn',
    spaceDelimited: false,
    characterBased: true,
    speechName: 'zh-CN',
    voiceNames: [
      {
        name: '云希',
        code: 'zh-CN-YunxiNeural',
        gender: 'M',
      },
      {
        name: '晓晓',
        code: 'zh-CN-XiaoxiaoNeural',
        gender: 'F',
      },
    ],
  },
  {
    name: '繁体中文',
    locale: 'zh-tw',
    spaceDelimited: false,
    characterBased: true,
    speechName: 'zh-TW',
    voiceNames: [
      {
        name: '曉臻',
        code: 'zh-TW-HsiaoChenNeural',
        gender: 'F',
      },
      {
        name: '雲哲',
        code: 'zh-TW-YunJheNeural',
        gender: 'M',
      },
    ],
  },
  {
    name: '日本語',
    locale: 'ja',
    spaceDelimited: false,
    characterBased: true,
    speechName: 'ja-JP',
    voiceNames: [
      {
        name: '七海',
        code: 'ja-JP-NanamiNeural',
        gender: 'F',
      },
      {
        name: '圭太',
        code: 'ja-JP-KeitaNeural',
        gender: 'M',
      },
    ],
  },
  {
    name: '한국어',
    locale: 'ko',
    spaceDelimited: true,
    characterBased: true,
    speechName: 'ko-KR',
    voiceNames: [
      {
        name: '선히',
        code: 'ko-KR-SunHiNeural',
        gender: 'F',
      },
      {
        name: '인준',
        code: 'ko-KR-InJoonNeural',
        gender: 'M',
      },
    ],
  },
  {
    name: 'Español',
    locale: 'es',
    spaceDelimited: true,
    characterBased: false,
    speechName: 'es-ES',
    voiceNames: [
      {
        name: 'Alvaro',
        code: 'es-ES-AlvaroNeural',
        gender: 'M',
      },
      {
        name: 'Elvira',
        code: 'es-ES-ElviraNeural',
        gender: 'F',
      },
    ],
  },
]

export const LANGUAGES_MAP = LANGUAGES.reduce((acc, cur) => {
  acc[cur.locale] = cur
  return acc
}, {} as Record<string, Language>)

export const SYSTEM_LANG_FIELD = 'systemLang'
export const LEARNING_LANG_FIELD = 'learningLang'
