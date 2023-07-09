import { NextRequest, NextResponse } from 'next/server'
import {
  AudioConfig,
  AudioFormatTag,
  AudioInputStream,
  AudioStreamFormat,
  CancellationDetails,
  CancellationReason,
  ResultReason,
  SpeechConfig,
  SpeechRecognitionResult,
  SpeechRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk'

// TODO
const speechConfig = SpeechConfig.fromSubscription('', '')
speechConfig.speechRecognitionLanguage = 'en-US'

export async function POST(request: NextRequest) {
  const data = await request.formData()
  const audioBlob = data.get('audio') as File
  console.log(audioBlob.type)

  const pushStream = AudioInputStream.createPushStream()
  pushStream.write(await audioBlob.arrayBuffer())
  const audioConfig = AudioConfig.fromStreamInput(pushStream)
  const speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig)
  const result = await recognize(speechRecognizer)
  switch (result.reason) {
    case ResultReason.RecognizedSpeech:
      console.log(`RECOGNIZED: Text=${result.text}`)
      break
    case ResultReason.NoMatch:
      console.log('NOMATCH: Speech could not be recognized.')
      break
    case ResultReason.Canceled:
      const cancellation = CancellationDetails.fromResult(result)
      console.log(`CANCELED: Reason=${cancellation.reason}`)

      if (cancellation.reason == CancellationReason.Error) {
        console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`)
        console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`)
      }
      break
  }
  speechRecognizer.close()
  pushStream.close()
  return new NextResponse('Yes')
}

async function recognize(speechRecognizer: SpeechRecognizer): Promise<SpeechRecognitionResult> {
  return new Promise<SpeechRecognitionResult>((resolve, reject) => {
    console.log('Sending!')
    speechRecognizer.recognizeOnceAsync(
      (result) => {
        console.log('Returned!')
        resolve(result)
      },
      (err) => {
        console.log('Error!')
        reject(err)
      }
    )
  })
}
