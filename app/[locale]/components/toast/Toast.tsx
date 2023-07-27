import { useEffect, useState } from 'react'

export function Toast({
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
      className={`${
        fadeOut ? 'opacity-0 -translate-y-4' : 'opacity-1'
      } transition duration-300 absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/50 px-4 py-3 text-white text-center`}
      onAnimationEnd={() => {
        if (fadeOut) {
          removeToast(id)
        }
      }}
    >
      <span>{message}</span>
    </div>
  )
}
