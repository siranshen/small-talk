import { SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk'

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
