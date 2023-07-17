import { AUDIO_VOLUMN_BIN_COUNT, AudioChatMessage } from '@/app/utils/chat-message'
import AudioPauseIcon from '@/public/icons/audio-pause.svg'
import AudioPlayIcon from '@/public/icons/audio-play.svg'
import LoadingIcon from '@/public/icons/loading.svg'
import { useCallback, useEffect, useRef, useState } from 'react'

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 48
const DISPLAY_RATIO = 2
const MAX_BAR_HEIGHT = CANVAS_HEIGHT / 2
const GAP_WIDTH = CANVAS_WIDTH / (AUDIO_VOLUMN_BIN_COUNT + 1)
const LINE_WIDTH = 6
const PROGRESS_WIDTH = CANVAS_WIDTH - GAP_WIDTH * 2 + LINE_WIDTH

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
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const progressCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const requestAnimationFrameRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  // rgb(51,51,51) === #333
  const audioPlayedColor = isAi ? 'rgba(255,255,255,1)' : 'rgba(51,51,51,1)'
  const audioUnplayedColor = isAi ? 'rgba(255,255,255,0.6)' : 'rgba(51,51,51,0.6)'
  // See --main-theme-color and --secondary-theme-color
  const audioFillColor = isAi ? '#007aff' : '#f4f4f5'

  // Draw the progress on each frame while audio is playing
  useEffect(() => {
    if (!audioRef.current) {
      return
    }
    if (isPlaying) {
      audioRef.current.play()
      const animate = () => {
        if (!message || !progressCanvasRef.current || !audioRef.current) {
          return
        }
        const audioMetadata = message.getAudioMetadata()
        const ctx = progressCanvasRef.current.getContext('2d')
        if (!audioMetadata || !ctx) {
          return
        }
        // Draw progress
        const progress = Math.min(audioRef.current.currentTime / audioMetadata.duration, 1)
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.fillStyle = audioPlayedColor
        ctx.fillRect(GAP_WIDTH - LINE_WIDTH / 2, 0, PROGRESS_WIDTH * progress, CANVAS_HEIGHT)
        requestAnimationFrameRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else {
      audioRef.current.pause()
      requestAnimationFrameRef.current && cancelAnimationFrame(requestAnimationFrameRef.current)
    }
  }, [audioPlayedColor, isPlaying, message])

  // Only draw the waveform once
  useEffect(() => {
    if (!message || !waveCanvasRef.current) {
      return
    }
    const audioMetadata = message.getAudioMetadata()
    const ctx = waveCanvasRef.current.getContext('2d')
    if (!audioMetadata || !ctx) {
      return
    }
    // Fill the background
    ctx.fillStyle = audioFillColor
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    // Draw waveform
    ctx.lineCap = 'round'
    ctx.lineWidth = LINE_WIDTH
    ctx.strokeStyle = audioUnplayedColor
    const midY = CANVAS_HEIGHT / 2
    for (let i = 0; i < AUDIO_VOLUMN_BIN_COUNT; i++) {
      const bar = new Path2D()
      const x = GAP_WIDTH * (i + 1)
      const offset = audioMetadata.volumeBins[i] * MAX_BAR_HEIGHT
      bar.moveTo(x, midY - offset)
      bar.lineTo(x, midY + offset)
      // First crop out the background, and then fill it with the color
      ctx.globalCompositeOperation = 'destination-out'
      ctx.stroke(bar)
      ctx.globalCompositeOperation = 'source-over'
      ctx.stroke(bar)
    }
  }, [audioUnplayedColor, audioFillColor, message])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!audioRef.current || !progressCanvasRef.current) {
      return
    }
    const bounding = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - bounding.left) * DISPLAY_RATIO
    if (x < GAP_WIDTH - LINE_WIDTH / 2 || x > CANVAS_WIDTH - GAP_WIDTH + LINE_WIDTH / 2) {
      return
    }
    const progress = Math.max(0, Math.min(1, (x - GAP_WIDTH + LINE_WIDTH / 2) / PROGRESS_WIDTH))
    audioRef.current.currentTime = progress * audioRef.current.duration
    setIsPlaying(true)
  }

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
              onEnded={() => {
                setIsPlaying(false)
                requestAnimationFrameRef.current && cancelAnimationFrame(requestAnimationFrameRef.current)
              }}
            />
          </button>
          <div className='relative w-[200px] h-[24px]'>
            <canvas
              ref={progressCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className='absolute inset-0 w-[200px] h-[24px]'
            ></canvas>
            <canvas
              ref={waveCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className='absolute inset-0 w-[200px] h-[24px]'
              onClick={handleCanvasClick}
            ></canvas>
          </div>
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
