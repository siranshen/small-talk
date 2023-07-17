export default function SidebarFunctionButton({ text, disabled, Icon }: { text: string; disabled?: boolean; Icon: any }) {
  return (
    <button
      className='rounded-lg border border-solid border-zinc-300 hover:bg-zinc-200 p-4 py-3 text-left flex items-center'
      disabled={disabled}
    >
      <Icon width={20} height={20} className='mr-3' />
      <span className='font-medium'>{text}</span>
    </button>
  )
}
