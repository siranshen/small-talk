import { NextRequest, NextResponse } from 'next/server'

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY ?? ''
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION ?? ''
const AZURE_SPEECH_ENDPOINT = `https://${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`

export async function POST(request: NextRequest) {
  // TODO: Authenticate request
  try {
    const response = await fetch(AZURE_SPEECH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    if (!response.ok) {
      console.error('Error getting Azure Speech token', response.status)
      return NextResponse.error()
    }
    const data = await response.text()
    return NextResponse.json({ token: data, region: AZURE_SPEECH_REGION })
  } catch (e) {
    console.error('Error getting Azure Speech token', e)
    return NextResponse.error()
  }
}
