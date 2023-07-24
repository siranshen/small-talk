export default function Toast({ message }: { message: string }) {
  return (
    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/50 px-4 py-3 text-white text-center'>
      <span>{message}</span>
    </div>
  )
}
