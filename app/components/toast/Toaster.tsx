import { ToastData } from '@/app/hooks/toast'
import Toast from './Toast'

export default function Toaster({ toasts, removeToast }: { toasts: ToastData[]; removeToast: (id: number) => void }) {
  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.id} id={toast.id} message={toast.message} duration={toast.duration} removeToast={removeToast} />
      ))}
    </>
  )
}
