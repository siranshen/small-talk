import { useEffect, useState } from 'react'

export default function Toast({
  id,
  message,
  duration,
  removeToast,
}: {
  id: number
  message: string
  duration: number
  removeToast: (id: number) => void
}) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    setTimeout(() => setFadeOut(true), duration - 300)
  }, [duration])

  return (
    <div
      className={`absolute z-50 top-1/2 left-1/2 -translate-x-1/2 ${
        fadeOut ? 'translate-y-1/2 opacity-0' : '-translate-y-1/2 animate-[fade-in_300ms]'
      } transition duration-300 rounded-lg bg-black/50 px-4 py-3 text-white text-center`}
      onTransitionEnd={() => {
        if (fadeOut) {
          removeToast(id)
        }
      }}
    >
      <span>{message}</span>
    </div>
  )
}
