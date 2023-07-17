import BarRightArrow from '@/public/icons/bar-right-arrow.svg'
import BarLeftArrow from '@/public/icons/bar-left-arrow.svg'

export default function SidebarToggleButton({
  open,
  sidebarOpen,
  setSidebarOpen,
}: {
  open: boolean
  sidebarOpen: boolean
  setSidebarOpen: Function
}) {
  var buttonStates = ''
  if (open) {
    buttonStates = 'mr-[-32px]'
    if (sidebarOpen) {
      buttonStates += ' hidden'
    }
  } else if (!sidebarOpen) {
    buttonStates = 'hidden'
  }
  return (
    <button
      className={`${buttonStates} lg:hidden right-0 bg-none absolute top-1 z-30 w-auto border-none p-1`}
      onClick={() => setSidebarOpen(open)}
    >
      {open ? <BarRightArrow alt='open' className='w-6 h-6' /> : <BarLeftArrow alt='close' className='w-6 h-6' />}
    </button>
  )
}
