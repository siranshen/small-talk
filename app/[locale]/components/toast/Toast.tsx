import { useCallback, useEffect, useState } from 'react'

interface ToastData {
  id: number
  message: string
  duration: number
}

export function useToasts(): [ToastData[], (message: string, duration?: number) => void, (id: number) => void] {
  const [toastsState, setToastsState] = useState<{ idCounter: number; toasts: ToastData[] }>({ idCounter: 0, toasts: [] })

  const addToast = useCallback((message: string, duration: number = 3000) => {
    setToastsState((state) => ({
      idCounter: state.idCounter + 1,
      toasts: [...state.toasts, { id: state.idCounter, message, duration }],
    }))
  }, [])

  const removeToast = useCallback((id: number) => {
    setToastsState((state) => ({
      ...state,
      toasts: state.toasts.filter((data) => data.id !== id),
    }))
  }, [])

  return [toastsState.toasts, addToast, removeToast]
}

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
    setTimeout(() => setFadeOut(true), duration - 600)
  }, [duration])

  return (
    <div
      className={`${
        fadeOut ? 'opacity-0' : 'opacity-1'
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
