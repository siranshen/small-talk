import AudioPlayIcon from '@/public/icons/audio-play.svg'
import LoadingIcon from '@/public/icons/loading.svg'

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

export function ChatLine({ isAi, isAudio, content }: { isAi: boolean; isAudio: boolean; content: string }) {
  return (
    <ChatLineLayout isAi={isAi}>
      {isAudio ? (
        <>
          <button className='border-none bg-none w-6 h-6 mr-3 flex-none hover:opacity-80'>
            <AudioPlayIcon width={24} height={24} alt='play' />
          </button>
          <canvas height='48' width='400' className='w-[200px] h-6'></canvas>
          <audio src={content} className='hidden' />
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
