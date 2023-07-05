import AudioPlayIcon from '@/public/icons/audio-play.svg';

export default function ChatLine({ isAi, isAudio, content }: { isAi: boolean; isAudio: boolean; content: string }) {
  return (
    <div
      className={`${
        isAi
          ? 'bg-[--main-theme-color] text-white first:rounded-tl-none'
          : 'bg-[--main-secondary-theme-color] first:rounded-tr-none'
      } rounded-lg mb-1 last:mb-0 py-3 px-5 flex items-center`}
    >
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
    </div>
  );
}
