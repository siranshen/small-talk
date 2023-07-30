import LoadingIcon from '@/public/icons/mic-loading.svg'

export default function Loading() {
  return (
    <div className='animate-[fade-in_300ms] flex justify-center'>
      <div className='h-16 w-16'>
        <LoadingIcon width={64} height={64} alt='Loading...' />
      </div>
    </div>
  )
}
