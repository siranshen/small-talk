import { v4 as uuidv4 } from 'uuid'
import { AudioMetadata, getMetadataFromWav } from './audio'

export class ChatMessage {
  private text: string
  private isAi: boolean
  private id: string = uuidv4()
  // The actual text that will be sent to the AI
  private llmText: string
  private streaming: boolean = false

  constructor(text: string, isAi: boolean, isStreaming?: boolean) {
    this.text = text.replaceAll(` ${PAUSE_TOKEN}`, '')
    this.llmText = text
    this.isAi = isAi
    if (isStreaming) {
      this.streaming = isStreaming
    }
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
    return this.text
  }

  isStreaming(): boolean {
    return this.streaming
  }

  toGPTMessage(): GPTMessage {
    return {
      role: this.isAi ? 'assistant' : 'user',
      content: this.llmText,
    }
  }
}

export const AUDIO_VOLUMN_BIN_COUNT = 39

export class AudioChatMessage extends ChatMessage {
  private audio: Blob
  private audioSrc: string
  private audioMetadata: AudioMetadata | null = null

  constructor(text: string, isAi: boolean, audio: Blob) {
    super(text, isAi)
    this.audio = audio
    // TODO Might have to be managed in a central place so it can revoked when the chat goes away
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
  isStreaming: boolean
  isConfiguringAudio: boolean
  isTranscribing: boolean
  shouldShowAiText: boolean
}

export const PAUSE_TOKEN = '§'
