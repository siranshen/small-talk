import { v4 as uuidv4 } from 'uuid';

export class ChatMessage {
  private id: string = uuidv4();

  constructor(private text: string) {
    this.text = text;
  }

  getType(): string {
    return 'text';
  }

  getId(): string {
    return this.id;
  }

  getText(): string {
    return this.text;
  }
}

export class AudioChatMessage extends ChatMessage {
  constructor(text: string, private audioSrc: string) {
    super(text);
    this.audioSrc = audioSrc;
  }

  getType(): string {
    return 'audio';
  }

  getAudioSrc(): string {
    return this.audioSrc;
  }
}
