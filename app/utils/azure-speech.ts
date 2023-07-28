import { QueueObject, queue } from 'async'
import { AudioPlayTask, exportAudioInWav, exportBufferInWav, exportBuffersInWav } from './audio'
import {
  AudioConfig,
  AudioInputStream,
  AudioStreamFormat,
  CancellationDetails,
  PushAudioInputStream,
  ResultReason,
  SpeechConfig,
  SpeechRecognizer,
  SpeechSynthesisOutputFormat,
  SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk'
import { Language } from './i18n'

const VALIDITY_DURATION = 9 * 60 * 1000 // Azure Speech access tokens are valid for 10 minutes. Using 9 minutes
let azureToken = {
  token: '',
  region: '',
  lastRetrieved: 0, // Unix timestamp in ms
}

async function getSpeechConfig(): Promise<SpeechConfig> {
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

export async function generateSpeech(speechSynthesizer: SpeechSynthesizer, lang: Language, text: string): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    speechSynthesizer.speakSsmlAsync(
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang.speechName}">
        <voice name="${lang.voiceNames[0].code}">
          <mstts:express-as style="cheerful" styledegree="0.5">
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
  private audioContext: AudioContext
  private audioBuffers: ArrayBuffer[] = []
  private sampleRate: number
  private lang: Language

  private speechSynthesizer: SpeechSynthesizer | null = null
  private audioPlayQueue: QueueObject<AudioPlayTask> | null = null
  private speechSynthesisQueue: QueueObject<SpeechSynthesisTask> | null = null
  private currentPlaying: AudioBufferSourceNode | null = null
  private running: boolean = false
  private waitPromise: Promise<void> | null = null
  private waitResolve: (() => void) | null = null

  constructor(audioContext: AudioContext, sampleRate: number, lang: Language) {
    this.audioContext = audioContext
    this.sampleRate = sampleRate
    this.lang = lang
  }

  async init(): Promise<void> {
    const speechConfig = await getSpeechConfig()
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Raw24Khz16BitMonoPcm
    this.speechSynthesizer = new SpeechSynthesizer(speechConfig, null as unknown as AudioConfig)
    this.waitPromise = new Promise<void>((resolve) => {
      this.waitResolve = resolve
    })
    this.running = true
    this.audioPlayQueue = queue(async (task: AudioPlayTask, _) => {
      this.audioBuffers.push(task.audioData)
      if (!this.running) {
        return
      }
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
      this.currentPlaying = source
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
      if (!this.speechSynthesizer) {
        return
      }
      try {
        const audioData = await generateSpeech(this.speechSynthesizer, this.lang, task.text)
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

  async exportAudio(): Promise<Blob> {
    if (!this.speechSynthesisQueue?.idle()) {
      await this.speechSynthesisQueue?.drain()
    }
    if (!this.audioPlayQueue?.idle()) {
      await this.audioPlayQueue?.drain()
    }
    return exportBuffersInWav(this.sampleRate, 1, this.audioBuffers)
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return
    }
    this.running = false
    this.currentPlaying?.stop()
    await this.waitPromise
  }

  complete(): void {
    this.waitResolve?.()
  }

  releaseResources(): void {
    this.speechSynthesizer?.close()
  }
}

export class SpeechRecognitionProcessor {
  private audioContext: AudioContext
  private audioStream: MediaStream
  private lang: Language
  private isSafari: boolean

  private audioSource: MediaStreamAudioSourceNode | null = null
  private processorNode: AudioWorkletNode | null = null
  private pushStream: PushAudioInputStream | null = null
  private buffers: Int16Array[][] = []
  private speechRecognizer: SpeechRecognizer | null = null
  private lastMessage: string = ''

  constructor(audioContext: AudioContext, audioStream: MediaStream, lang: Language, isSafari: boolean) {
    this.audioContext = audioContext
    this.audioStream = audioStream
    this.lang = lang
    this.isSafari = isSafari
  }

  async init(): Promise<void> {
    this.audioSource = this.audioContext.createMediaStreamSource(this.audioStream)
    this.processorNode = new AudioWorkletNode(this.audioContext, 'MonoProcessor')
    const pushStream = (this.pushStream = AudioInputStream.createPushStream(
      AudioStreamFormat.getWaveFormatPCM(this.audioContext.sampleRate, 16, 1)
    ))
    this.processorNode.port.onmessage = (event) => {
      switch (event.data.type) {
        case 'interm':
          this.buffers.push(event.data.buffers)
          break
        case 'final':
          pushStream.write(event.data.buffer)
          break
        default:
          console.error('Unhandled data', event.data)
      }
    }
    const audioConfig = AudioConfig.fromStreamInput(this.pushStream)
    const speechConfig = await getSpeechConfig()
    speechConfig.speechRecognitionLanguage = this.lang.speechName
    this.speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig)

    this.speechRecognizer.recognized = (_, event) => {
      let result = event.result
      switch (result.reason) {
        case ResultReason.RecognizedSpeech:
          console.log('Speech recognized', result.text)
          if (this.lastMessage === '') {
            this.lastMessage = result.text
          } else if (this.lang.spaceDelimited) {
            // Add space for English or other space-delimited languages
            this.lastMessage += ' ' + result.text
          } else {
            this.lastMessage += result.text
          }
          break
        case ResultReason.NoMatch:
          console.log('Speech could not be recognized.')
          break
        case ResultReason.Canceled:
          console.log(`Speech recognization canceled: ${CancellationDetails.fromResult(result)}`)
          break
        default:
          console.log('Unknown recognition result received.', result)
      }
    }

    this.audioSource?.connect(this.processorNode as AudioNode)
    if (this.isSafari) {
      // Safari requires connecting to destination to start recording
      this.processorNode?.connect(this.audioContext.destination)
    }
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!this.speechRecognizer) {
        reject('Speech recognizer not initialized')
        return
      }
      this.speechRecognizer?.startContinuousRecognitionAsync(
        () => {
          resolve()
        },
        (err) => {
          reject(err)
        }
      )
    })
  }

  async stopAndGetResult(): Promise<string> {
    this.audioSource?.disconnect()
    this.processorNode?.port.close()
    this.processorNode?.disconnect()
    this.pushStream?.close()
    return await new Promise<string>((resolve, reject) => {
      if (!this.speechRecognizer) {
        resolve(this.lastMessage)
        return
      }
      this.speechRecognizer.stopContinuousRecognitionAsync(
        () => {
          resolve(this.lastMessage)
        },
        (err) => {
          reject(err)
        }
      )
    })
  }

  exportAudio(): Blob {
    return exportAudioInWav(this.audioContext.sampleRate, this.buffers)
  }

  releaseResources(): void {
    this.audioStream?.getTracks().forEach((track) => track.stop())
    this.pushStream?.close()
    this.speechRecognizer?.close()
  }
}
