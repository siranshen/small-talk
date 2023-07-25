import { QueueObject, queue } from 'async'
import { SpeechConfig, SpeechRecognizer, SpeechSynthesizer } from 'microsoft-cognitiveservices-speech-sdk'
import { AudioPlayTask, exportBufferInWav, exportBuffersInWav } from './audio'
import { Language } from './i18n'

export async function startRecognition(speechRecognizer: SpeechRecognizer | null): Promise<void> {
  if (!speechRecognizer) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    speechRecognizer.startContinuousRecognitionAsync(
      () => {
        resolve()
      },
      (err) => {
        reject(err)
      }
    )
  })
}

export async function stopRecognition(speechRecognizer: SpeechRecognizer | null): Promise<void> {
  if (!speechRecognizer) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    speechRecognizer.stopContinuousRecognitionAsync(
      () => {
        resolve()
      },
      (err) => {
        reject(err)
      }
    )
  })
}

const VALIDITY_DURATION = 9 * 60 * 1000 // Azure Speech access tokens are valid for 10 minutes. Using 9 minutes
let azureToken = {
  token: '',
  region: '',
  lastRetrieved: 0, // Unix timestamp in ms
}

export async function getSpeechConfig(): Promise<SpeechConfig> {
  if (azureToken.lastRetrieved + VALIDITY_DURATION < Date.now()) {
    // Token is about to expire. Get a new one
    try {
      const response = await fetch('/api/azurespeech/token', {
        method: 'POST',
      })
      if (!response.ok) {
        console.log('Error retrieving Azure speech token', response.status, response.statusText)
        return Promise.reject('Internal error')
      }
      const data = await response.json()
      azureToken = {
        token: data.token,
        region: data.region,
        lastRetrieved: Date.now(),
      }
    } catch (e) {
      console.error('Error constructing Azure speech recognizer', e)
      return Promise.reject(e)
    }
  }
  return SpeechConfig.fromAuthorizationToken(azureToken.token, azureToken.region)
}

export interface SpeechSynthesisTask {
  text: string
}

export async function generateSpeech(speechSynthesizer: SpeechSynthesizer, text: string, lang: Language): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    speechSynthesizer.speakSsmlAsync(
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang.speechName}">
        <voice name="${lang.voiceNames[0].code}">
          <mstts:express-as style="cheerful">
            <prosody rate="+10.00%">
              ${text}
            </prosody>
          </mstts:express-as>
        </voice>
      </speak>`,
      (result) => {
        console.log('Speech synthesis result', result)
        resolve(result.audioData)
      },
      (err) => {
        console.log('Speech synthesis error', err)
        reject(err)
      }
    )
  })
}

export class SpeechSynthesisTaskProcessor {
  private speechSynthesizer: SpeechSynthesizer
  private audioContext: AudioContext
  private audioBuffers: ArrayBuffer[] = []
  private sampleRate: number
  private lang: Language
  private audioPlayQueue: QueueObject<AudioPlayTask> | null = null
  private speechSynthesisQueue: QueueObject<SpeechSynthesisTask> | null = null

  constructor(audioContext: AudioContext, speechSynthesizer: SpeechSynthesizer, sampleRate: number, lang: Language) {
    this.audioContext = audioContext
    this.speechSynthesizer = speechSynthesizer
    this.sampleRate = sampleRate
    this.lang = lang
  }

  start(): void {
    this.audioPlayQueue = queue(async (task: AudioPlayTask, _) => {
      this.audioBuffers.push(task.audioData)
      const tempAudioBlob = exportBufferInWav(this.sampleRate, 1, task.audioData)
      let decodedBuffer: AudioBuffer
      try {
        decodedBuffer = await this.audioContext.decodeAudioData(await tempAudioBlob.arrayBuffer())
      } catch (e) {
        console.error('Error decoding audio buffer', e)
        return
      }
      const source = this.audioContext.createBufferSource()
      source.buffer = decodedBuffer
      source.connect(this.audioContext.destination)
      await new Promise<void>((resolve) => {
        source.onended = () => {
          resolve()
        }
        source.start()
      })
    }, 1)
    this.speechSynthesisQueue = queue(async (task: SpeechSynthesisTask, _) => {
      if (task.text.trim() === '') {
        return
      }
      try {
        const audioData = await generateSpeech(this.speechSynthesizer, task.text, this.lang)
        this.audioPlayQueue?.push({ audioData })
      } catch (e) {
        console.error('Error generating speech', e)
        return
      }
    }, 1)
  }

  async pushTask(task: SpeechSynthesisTask): Promise<void> {
    await this.speechSynthesisQueue?.push(task)
  }

  async finish(): Promise<Blob> {
    await this.speechSynthesisQueue?.drain()
    await this.audioPlayQueue?.drain()
    return exportBuffersInWav(this.sampleRate, 1, this.audioBuffers)
  }
}
