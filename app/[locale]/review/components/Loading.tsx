import LoadingIcon from '@/public/icons/mic-loading.svg'

export default function Loading() {
  return (
    <div className='animate-[fade-in_300ms] flex justify-center text-[--main-theme-color] opacity-80'>
      <div className='h-20 w-20'>
        <LoadingIcon width={80} height={80} alt='Loading...' />
      </div>
    </div>
  )
}
