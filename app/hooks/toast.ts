import { useCallback, useState } from "react";

interface ToastData {
  id: number
  message: string
  duration: number
}

export default function useToasts(): [ToastData[], (message: string, duration?: number) => void, (id: number) => void] {
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