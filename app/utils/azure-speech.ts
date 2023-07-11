import { AudioConfig, SpeechConfig, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk'

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

export async function getSpeechRecognizer(audioConfig: AudioConfig): Promise<SpeechRecognizer> {
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
  const speechConfig = SpeechConfig.fromAuthorizationToken(azureToken.token, azureToken.region)
  return Promise.resolve(new SpeechRecognizer(speechConfig, audioConfig))
}
