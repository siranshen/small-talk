import { v4 as uuidv4 } from 'uuid';

export class ChatMessage {
  private id: string = uuidv4();

  constructor(private text: string, private isAi: boolean) {
    this.text = text;
    this.isAi = isAi;
  }

  getType(): string {
    return 'text';
  }

  getId(): string {
    return this.id;
  }

  isAiMessage(): boolean {
    return this.isAi;
  }

  getText(): string {
    return this.text;
  }

  toGPTMessage(): GPTMessage {
    return {
      role: this.isAi ? 'assistant' : 'user',
      content: this.text,
    }
  }
}

export class AudioChatMessage extends ChatMessage {
  constructor(text: string, isAi: boolean, private audioSrc: string) {
    super(text, isAi);
    this.audioSrc = audioSrc;
  }

  getType(): string {
    return 'audio';
  }

  getAudioSrc(): string {
    return this.audioSrc;
  }
}

export interface GPTMessage {
  role: 'system' | 'assistant' | 'user'
  content: string
}

export const PAUSE_TOKEN = '§';