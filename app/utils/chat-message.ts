import { v4 as uuidv4 } from 'uuid'
import { AudioMetadata, getMetadataFromWav } from './audio'

export class ChatMessage {
  protected text: string
  protected isAi: boolean
  protected id: string
  // The actual text that will be displayed
  protected displayedText: string
  protected streaming: boolean

  constructor(text: string, isAi: boolean, isStreaming: boolean = false, id?: string) {
    this.text = text
    this.displayedText = text.replaceAll(` ${PAUSE_TOKEN}`, '').replaceAll(PAUSE_TOKEN, '')
    this.isAi = isAi
    this.streaming = isStreaming
    this.id = id || uuidv4()
  }

  getType(): string {
    return 'text'
  }

  getId(): string {
    return this.id
  }

  isAiMessage(): boolean {
    return this.isAi
  }

  getText(): string {
    return this.displayedText
  }

  isStreaming(): boolean {
    return this.streaming
  }

  toGPTMessage(useDisplayedText: boolean = false): GPTMessage {
    return {
      role: this.isAi ? 'assistant' : 'user',
      content: useDisplayedText? this.displayedText : this.text,
    }
  }

  toObject(): object {
    return {
      text: this.text,
      isAi: this.isAi,
      id: this.id,
    }
  }

  static fromObject(obj: any): ChatMessage {
    return new ChatMessage(obj.text, obj.isAi, false, obj.id)
  }
}

export const AUDIO_VOLUMN_BIN_COUNT = 39

export class AudioChatMessage extends ChatMessage {
  protected audio: Blob
  protected audioSrc: string
  protected audioMetadata: AudioMetadata | null = null

  constructor(text: string, isAi: boolean, audio: Blob) {
    super(text, isAi)
    this.audio = audio
    // TODO Might have to be managed in a central place so it can be revoked when the chat goes away
    this.audioSrc = URL.createObjectURL(audio)
  }

  getType(): string {
    return 'audio'
  }

  getAudioSrc(): string {
    return this.audioSrc
  }

  async loadAudioMetadata(): Promise<void> {
    if (this.audioMetadata === null) {
      this.audioMetadata = await getMetadataFromWav(this.audio, AUDIO_VOLUMN_BIN_COUNT)
    }
  }

  getAudioMetadata(): AudioMetadata {
    return this.audioMetadata as AudioMetadata
  }
}

export interface GPTMessage {
  role: 'system' | 'assistant' | 'user'
  content: string
}

export interface MessageStates {
  started: boolean
  isStreaming: boolean
  isConfiguringAudio: boolean
  isTranscribing: boolean
  shouldShowAiText: boolean
  isPlayingAudio: boolean
}

export const PAUSE_TOKEN = '§'

export function serializeConvo(convo: ChatMessage[]): string {
  return JSON.stringify(convo.map((m) => m.toObject()))
}

export function deserializeConvo(serializedConvo: string): ChatMessage[] {
  return JSON.parse(serializedConvo).map((m: any) => ChatMessage.fromObject(m))
}