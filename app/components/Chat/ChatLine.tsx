import { AUDIO_VOLUMN_BIN_COUNT, AudioChatMessage } from '@/app/utils/chat-message'
import AudioPauseIcon from '@/public/icons/audio-pause.svg'
import AudioPlayIcon from '@/public/icons/audio-play.svg'
import LoadingIcon from '@/public/icons/loading.svg'
import { useEffect, useRef, useState } from 'react'

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 48
const MAX_BAR_HEIGHT = CANVAS_HEIGHT / 2
const GAP_WIDTH = CANVAS_WIDTH / (AUDIO_VOLUMN_BIN_COUNT + 2)
const LINE_WIDTH = 6

function ChatLineLayout({ isAi, children }: { isAi: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`${
        isAi ? 'bg-[--main-theme-color] text-white first:rounded-tl-none' : 'bg-[--secondary-theme-color] first:rounded-tr-none'
      } rounded-lg mb-1 last:mb-0 py-3 px-5 flex items-center`}
    >
      {children}
    </div>
  )
}

export function ChatLine({
  isAi,
  isAudio,
  content,
  message,
}: {
  isAi: boolean
  isAudio: boolean
  content?: string
  message?: AudioChatMessage
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [curAudioTime, setCurAudioTime] = useState<number>(0)
  // rgb(51,51,51) === #333
  const audioPlayedColor = isAi ? 'rgba(255,255,255,1)' : 'rgba(51,51,51,1)'
  const audioUnplayedColor = isAi ? 'rgba(255,255,255,0.6)' : 'rgba(51,51,51,0.6)'

  useEffect(() => {
    if (!audioRef.current) {
      return
    }
    if (isPlaying) {
      audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    if (!message || !canvasRef.current || !audioRef.current) {
      return
    }
    const audioMetadata = message.getAudioMetadata()
    if (!audioMetadata) {
      return
    }
    const pos = Math.min(curAudioTime / audioMetadata.duration, 1)
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) {
      return
    }
    // Draw audio wave
    ctx.lineCap = 'round'
    ctx.lineWidth = LINE_WIDTH
    const lineargradient = ctx.createLinearGradient(GAP_WIDTH - LINE_WIDTH / 2, 0, CANVAS_WIDTH - GAP_WIDTH + LINE_WIDTH / 2, 0)
    lineargradient.addColorStop(0, audioPlayedColor)
    lineargradient.addColorStop(pos, audioPlayedColor)
    lineargradient.addColorStop(pos, audioUnplayedColor)
    lineargradient.addColorStop(1, audioUnplayedColor)
    ctx.strokeStyle = lineargradient
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const midY = CANVAS_HEIGHT / 2
    for (let i = 0; i < AUDIO_VOLUMN_BIN_COUNT; i++) {
      const bar = new Path2D()
      const x = GAP_WIDTH * (i + 1)
      const offset = audioMetadata.volumeBins[i] * MAX_BAR_HEIGHT
      bar.moveTo(x, midY - offset)
      bar.lineTo(x, midY + offset)
      ctx.stroke(bar)
    }
  }, [curAudioTime, audioPlayedColor, audioUnplayedColor, message])

  return (
    <ChatLineLayout isAi={isAi}>
      {isAudio ? (
        <>
          <button
            className='border-none bg-none w-6 h-6 mr-3 flex-none hover:opacity-80'
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <AudioPauseIcon width={24} height={24} alt='pause' />
            ) : (
              <AudioPlayIcon width={24} height={24} alt='play' />
            )}
            <audio
              ref={audioRef}
              src={message?.getAudioSrc()}
              className='hidden'
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurAudioTime(e.currentTarget.currentTime)}
            />
          </button>
          <canvas ref={canvasRef} height={CANVAS_HEIGHT} width={CANVAS_WIDTH} className='w-[200px] h-6'></canvas>
        </>
      ) : (
        content
      )}
    </ChatLineLayout>
  )
}

export function LoadingChatLine({ isAi }: { isAi: boolean }) {
  return (
    <ChatLineLayout isAi={isAi}>
      <LoadingIcon width={24} height={24} alt='loading' />
    </ChatLineLayout>
  )
}
