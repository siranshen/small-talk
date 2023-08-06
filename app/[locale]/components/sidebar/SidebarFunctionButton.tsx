import { MouseEventHandler } from 'react'

export default function SidebarFunctionButton({
  text,
  disabled,
  onClick,
  Icon,
}: {
  text: string
  disabled?: boolean
  onClick: MouseEventHandler
  Icon: any
}) {
  return (
    <button
      className='rounded-lg border border-solid border-zinc-300 hover:bg-zinc-200 px-4 py-3 text-left flex items-center'
      disabled={disabled}
      onClick={onClick}
      {...(disabled ? { 'title': 'Coming soon...' } : {})}
    >
      <Icon width={20} height={20} className='mr-3' />
      <span className='font-medium'>{text}</span>
    </button>
  )
}
